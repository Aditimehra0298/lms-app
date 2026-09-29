import { NextResponse } from "next/server";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { prisma } from "@/lib/prisma";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { findExistingEnrollment } from "@/lib/server/enrollment-lookup";
import {
  ensureProgressForReadyCertificate,
  listLearnerCourseProgressFromStore,
  upsertLearnerCourseProgressInStore,
  type StoredLearnerCourseProgress,
} from "@/lib/server/learner-course-progress-store";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

function moduleTotalForSlug(
  slug: string,
  moduleCountBySlug: Map<string, number>,
): number {
  return moduleCountBySlug.get(slug) ?? moduleCountBySlug.get(canonicalCourseSlug(slug)) ?? 0;
}

/**
 * If the learner passed every recorded exam and is only one module short,
 * fill the last module so Admin + dashboard both show Completed / 100%.
 */
async function healNearlyComplete(
  email: string,
  slug: string,
  progress: StoredLearnerCourseProgress,
  totalModules: number,
): Promise<StoredLearnerCourseProgress> {
  if (totalModules <= 0) return progress;
  const completed = progress.completedModules ?? [];
  const exams = Object.values(progress.examScores ?? {});
  const allExamsPassed = exams.length > 0 && exams.every((e) => e.passed);
  const oneShort = completed.length >= totalModules - 1 && completed.length < totalModules;
  const alreadyFull = completed.length >= totalModules;
  if (alreadyFull) return progress;
  if (!allExamsPassed || !oneShort) return progress;

  const full = Array.from({ length: totalModules }, (_, i) => i + 1);
  return upsertLearnerCourseProgressInStore({
    learnerEmail: email,
    courseSlug: slug,
    completedModules: full,
    examScores: progress.examScores ?? {},
  });
}

/**
 * Source of truth for My Learning progress bars (matches Admin → Users course progress).
 */
export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const [certs, progressBySlug, courses, programs, purchases] = await Promise.all([
      prisma.lmsCertificate.findMany({
        where: { learnerEmail: email, status: "ready" },
        select: { courseSlug: true, scorePercent: true },
        orderBy: { issuedAt: "desc" },
      }),
      listLearnerCourseProgressFromStore(email),
      getManagedCourses(),
      getPublishedTutorLedPrograms(),
      prisma.lmsPurchase.findMany({
        where: { learnerEmail: email },
        select: { courseSlug: true },
      }),
    ]);

    const moduleCountBySlug = new Map<string, number>();
    for (const course of courses) {
      const slug = canonicalCourseSlug(course.slug) || course.slug.trim();
      if (slug) moduleCountBySlug.set(slug, countLearnerCurriculumModules(course.curriculum));
    }
    for (const program of programs) {
      const slug = canonicalCourseSlug(program.slug) || program.slug.trim();
      if (!slug) continue;
      const n = Array.isArray(program.curriculum) ? program.curriculum.length : 0;
      if (n > 0) moduleCountBySlug.set(slug, n);
    }

    const slugs = new Set<string>();
    for (const p of purchases) {
      const s = canonicalCourseSlug(p.courseSlug) || p.courseSlug.trim();
      if (s) slugs.add(s);
    }
    for (const slug of Object.keys(progressBySlug)) {
      const s = canonicalCourseSlug(slug) || slug;
      if (s) slugs.add(s);
    }
    for (const c of certs) {
      const s = canonicalCourseSlug(c.courseSlug) || c.courseSlug.trim();
      if (s) slugs.add(s);
    }

    const completedSlugs: string[] = [];
    const percentBySlug: Record<string, number> = {};
    const modulesBySlug: Record<string, { completed: number; total: number }> = {};

    for (const slug of slugs) {
      let progress = progressBySlug[slug] ?? progressBySlug[canonicalCourseSlug(slug)] ?? null;
      const total = moduleTotalForSlug(slug, moduleCountBySlug);
      const readyCert = certs.find(
        (c) => canonicalCourseSlug(c.courseSlug) === slug || c.courseSlug.trim() === slug,
      );

      if (readyCert) {
        progress = await ensureProgressForReadyCertificate({
          learnerEmail: email,
          courseSlug: slug,
          moduleCount: total || undefined,
          scorePercent: readyCert.scorePercent,
        });
      } else if (progress && total > 0) {
        progress = await healNearlyComplete(email, slug, progress, total);
      }

      // Confirm enrollment before advertising progress (skip orphans).
      const enrolled =
        purchases.some(
          (p) => canonicalCourseSlug(p.courseSlug) === slug || p.courseSlug.trim() === slug,
        ) || Boolean(readyCert);
      if (!enrolled) {
        const exists = await findExistingEnrollment({ learnerEmail: email, courseSlug: slug }).catch(
          () => null,
        );
        if (!exists && !progress) continue;
      }

      const completed = progress?.completedModules?.length ?? 0;
      const safeTotal = Math.max(total, completed, 0);
      let percent =
        readyCert || (safeTotal > 0 && completed >= safeTotal)
          ? 100
          : safeTotal > 0
            ? Math.min(100, Math.round((completed / safeTotal) * 100))
            : completed > 0
              ? 100
              : 0;

      if (percent >= 100) {
        completedSlugs.push(slug);
        percent = 100;
      }
      percentBySlug[slug] = percent;
      modulesBySlug[slug] = { completed, total: safeTotal || total };
    }

    return NextResponse.json(
      {
        ok: true,
        completedSlugs: [...new Set(completedSlugs)],
        percentBySlug,
        modulesBySlug,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/learner/completion-status]", err);
    return NextResponse.json({ ok: false, message: "Could not load completion status." }, { status: 503 });
  }
}
