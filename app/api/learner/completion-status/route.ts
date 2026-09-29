import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { prisma } from "@/lib/prisma";
import {
  ensureProgressForReadyCertificate,
  listLearnerCourseProgressFromStore,
} from "@/lib/server/learner-course-progress-store";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

/**
 * Source of truth for My Learning progress bars:
 * MySQL ready certificates → 100%, plus any stored module progress.
 */
export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const [certs, progressBySlug] = await Promise.all([
      prisma.lmsCertificate.findMany({
        where: { learnerEmail: email, status: "ready" },
        select: { courseSlug: true, scorePercent: true, courseTitle: true },
        orderBy: { issuedAt: "desc" },
      }),
      listLearnerCourseProgressFromStore(email),
    ]);

    const completedSlugs: string[] = [];
    const percentBySlug: Record<string, number> = {};

    for (const [slug, row] of Object.entries(progressBySlug)) {
      const key = canonicalCourseSlug(slug) || slug;
      const n = row.completedModules?.length ?? 0;
      if (n > 0) percentBySlug[key] = Math.max(percentBySlug[key] ?? 0, Math.min(100, n * 10));
    }

    for (const cert of certs) {
      const slug = canonicalCourseSlug(cert.courseSlug) || cert.courseSlug.trim();
      if (!slug) continue;
      completedSlugs.push(slug);
      percentBySlug[slug] = 100;
      void ensureProgressForReadyCertificate({
        learnerEmail: email,
        courseSlug: slug,
        scorePercent: cert.scorePercent,
      }).catch(() => undefined);
    }

    return NextResponse.json(
      {
        ok: true,
        completedSlugs: [...new Set(completedSlugs)],
        percentBySlug,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/learner/completion-status]", err);
    return NextResponse.json({ ok: false, message: "Could not load completion status." }, { status: 503 });
  }
}
