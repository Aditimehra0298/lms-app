import { NextResponse } from "next/server";
import type { ManagedCourse } from "@/lib/content-schema";
import { applyStandardCoursePricing } from "@/lib/standard-course-pricing";
import { slugifyCourseTitle, uniqueCourseSlug } from "@/lib/course-slugify";
import {
  applyGeneratedLandingToCourse,
  buildManagedCourseFromGenerated,
  generateCourseLandingFromDescription,
  isCourseLandingAiConfigured,
} from "@/lib/server/course-landing-ai-generate";
import { readAdminContentFromDisk, writeAdminContent } from "@/lib/server/content-store";
import { syncAllCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

type Body = {
  /** Existing course slug (preferred). */
  slug?: string;
  /** Create or match by title when slug missing. */
  title?: string;
  /** Extra notes for the model (modules, audience, etc.). */
  description?: string;
  category?: string;
  /** Persist into admin-content.json (default true). */
  save?: boolean;
};

function findCourse(courses: ManagedCourse[], slug?: string, title?: string): ManagedCourse | undefined {
  const s = slug?.trim().toLowerCase();
  if (s) {
    const bySlug = courses.find((c) => c.slug.trim().toLowerCase() === s);
    if (bySlug) return bySlug;
  }
  const t = title?.trim().toLowerCase();
  if (!t) return undefined;
  return courses.find((c) => c.title.trim().toLowerCase() === t);
}

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      ok: true,
      configured: isCourseLandingAiConfigured(),
      hint: 'POST { slug?, title, description?, category?, save?: true } — fills landing page via OpenAI; keeps curriculum.',
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    if (!isCourseLandingAiConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Add OPENAI_API_KEY to .env.local, restart npm run dev, then try again.",
        },
        { status: 503, headers: noStore },
      );
    }

    const body = (await request.json()) as Body;
    const titleHint =
      body.title?.trim() ||
      "Certified Ethical Hacking and Penetration Testing";
    const description =
      body.description?.trim() ||
      `${titleHint}

Self-paced professional program covering ethical hacking methodology, reconnaissance, vulnerability assessment, web/network penetration testing concepts, privilege escalation awareness, reporting, and legal/ethical boundaries. Include module quizzes and a practical learning path suitable for IT and security beginners moving toward intermediate skills.`;

    const existing = await readAdminContentFromDisk();
    const courses = [...(existing.managedCourses ?? [])];
    const found = findCourse(courses, body.slug, titleHint);

    const generated = await generateCourseLandingFromDescription({
      title: titleHint,
      description,
      category: body.category?.trim() || found?.category,
    });
    if (!generated.ok) {
      return NextResponse.json(
        { ok: false, message: generated.message },
        { status: 502, headers: noStore },
      );
    }

    const save = body.save !== false;

    let nextCourse: ManagedCourse;
    let created = false;

    if (found) {
      nextCourse = applyGeneratedLandingToCourse(found, generated.data, generated.theme);
      const idx = courses.findIndex((c) => c.slug === found.slug);
      courses[idx] = nextCourse;
    } else {
      created = true;
      const taken = new Set(courses.map((c) => c.slug.trim()));
      const slug =
        body.slug?.trim() ||
        uniqueCourseSlug(slugifyCourseTitle(generated.data.title || titleHint), taken);
      const category =
        body.category?.trim() ||
        (/hack|pentest|cyber|security/i.test(titleHint) ? "cyber-security" : "food-safety");
      nextCourse = applyStandardCoursePricing(
        buildManagedCourseFromGenerated({
          generated: generated.data,
          slug,
          category,
          sourceDescription: description,
          theme: generated.theme,
        }),
      );
      nextCourse.published = true;
      nextCourse.learningFormat = "self-paced";
      courses.push(nextCourse);
    }

    if (save) {
      const next = { ...existing, managedCourses: courses };
      await writeAdminContent(next);
      try {
        await syncManagedCoursesToMysql([nextCourse]);
        await syncAllCourseContentToMysql([nextCourse]);
      } catch (err) {
        console.error("[ai-landing] MySQL sync", err);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        created,
        saved: save,
        slug: nextCourse.slug,
        title: nextCourse.title,
        theme: generated.theme,
        previewUrl: `/courses/${nextCourse.slug}`,
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[ai-landing]", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "AI landing failed" },
      { status: 500, headers: noStore },
    );
  }
}
