import { NextResponse } from "next/server";
import type { ManagedCourse } from "@/lib/content-schema";
import { parseBulkCourseImportText, type BulkCourseImportRow } from "@/lib/bulk-food-course-import";
import {
  assignUniqueSlugs,
  buildManagedCourseFromGenerated,
  generateCourseLandingFromDescription,
  isCourseLandingAiConfigured,
} from "@/lib/server/course-landing-ai-generate";
import { readAdminContent, writeAdminContent } from "@/lib/server/content-store";
import { syncAllCourseContentToMysql } from "@/lib/server/course-content-mysql-sync";
import { syncManagedCoursesToMysql } from "@/lib/server/course-mysql-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

type RequestBody = {
  /** Raw paste text (see lib/bulk-food-course-import.ts) */
  text?: string;
  /** Or structured rows */
  courses?: BulkCourseImportRow[];
  category?: string;
  /** When true, append generated courses to admin-content.json */
  save?: boolean;
  /** Skip rows whose slug already exists */
  skipExisting?: boolean;
};

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      configured: isCourseLandingAiConfigured(),
      hint: "POST { text, save?: boolean, category?: 'food-safety' }",
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const category = body.category?.trim() || "food-safety";

    let rows: BulkCourseImportRow[] = [];
    if (Array.isArray(body.courses) && body.courses.length > 0) {
      rows = body.courses.filter((r) => r.title?.trim() || r.description?.trim());
    } else if (body.text?.trim()) {
      rows = parseBulkCourseImportText(body.text);
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No courses found. Paste a list or send courses[]." },
        { status: 400, headers: noStore },
      );
    }

    if (rows.length > 25) {
      return NextResponse.json(
        { ok: false, message: "Maximum 25 courses per batch. Split your list." },
        { status: 400, headers: noStore },
      );
    }

    if (!isCourseLandingAiConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Add OPENAI_API_KEY to .env.local, restart the dev server, then try again.",
        },
        { status: 503, headers: noStore },
      );
    }

    const existing = await readAdminContent();
    const existingCourses = existing.managedCourses ?? [];
    const existingSlugs = new Set(existingCourses.map((c) => c.slug.trim()));

    const slugs = assignUniqueSlugs(rows, existingSlugs);

    const results: Array<{
      title: string;
      slug: string;
      ok: boolean;
      message?: string;
      course?: ManagedCourse;
    }> = [];

    const generatedCourses: ManagedCourse[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const slug = slugs[i];

      if (body.skipExisting !== false && existingSlugs.has(slug)) {
        results.push({
          title: row.title,
          slug,
          ok: false,
          message: "Slug already exists — skipped.",
        });
        continue;
      }

      const ai = await generateCourseLandingFromDescription({
        title: row.title,
        description: row.description,
        category,
      });

      if (!ai.ok) {
        results.push({ title: row.title, slug, ok: false, message: ai.message });
        continue;
      }

      const course = buildManagedCourseFromGenerated({
        generated: ai.data,
        slug,
        category,
        sourceDescription: row.description,
        theme: ai.theme,
      });

      generatedCourses.push(course);
      existingSlugs.add(slug);
      results.push({ title: course.title, slug, ok: true, course });
    }

    const saved = Boolean(body.save) && generatedCourses.length > 0;

    if (saved) {
      const nextCourses = [...existingCourses, ...generatedCourses];
      await writeAdminContent({ ...existing, managedCourses: nextCourses });
      void (async () => {
        try {
          await syncManagedCoursesToMysql(nextCourses);
          await syncAllCourseContentToMysql(nextCourses);
        } catch (err) {
          console.error("[bulk-generate] MySQL sync", err);
        }
      })();
    }

    return NextResponse.json(
      {
        ok: true,
        saved,
        generated: generatedCourses.length,
        failed: results.filter((r) => !r.ok).length,
        results: results.map(({ course, ...rest }) => rest),
        courses: saved ? undefined : generatedCourses,
      },
      { headers: noStore },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Bulk generate failed" },
      { status: 500, headers: noStore },
    );
  }
}
