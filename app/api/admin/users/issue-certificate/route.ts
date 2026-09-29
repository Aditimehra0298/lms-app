import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { grantLearnerCertificateDownloadAccess } from "@/lib/server/admin-grant-certificate-access";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { getManagedCourses } from "@/lib/server/course-catalog";
import {
  getLearnerCourseProgressFromStore,
  upsertLearnerCourseProgressInStore,
} from "@/lib/server/learner-course-progress-store";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin → Users: force-issue a certificate for one learner + course.
 * Heals nearly-complete progress, then issues PDF (n8n or local fallback).
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let body: { learnerEmail?: string; courseSlug?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const learnerEmail = normalizeLearnerEmail(body.learnerEmail ?? "");
  const courseSlug = canonicalCourseSlug(body.courseSlug ?? "") || (body.courseSlug ?? "").trim();
  if (!learnerEmail || !courseSlug) {
    return NextResponse.json(
      { ok: false, message: "learnerEmail and courseSlug are required." },
      { status: 400 },
    );
  }

  try {
    const [courses, programs] = await Promise.all([
      getManagedCourses(),
      getPublishedTutorLedPrograms(),
    ]);
    let total = 0;
    for (const c of courses) {
      if (canonicalCourseSlug(c.slug) === courseSlug || c.slug === courseSlug) {
        total = countLearnerCurriculumModules(c.curriculum);
        break;
      }
    }
    if (!total) {
      for (const p of programs) {
        if (canonicalCourseSlug(p.slug) === courseSlug || p.slug === courseSlug) {
          total = Array.isArray(p.curriculum) ? p.curriculum.length : 0;
          break;
        }
      }
    }

    const progress = await getLearnerCourseProgressFromStore(learnerEmail, courseSlug);
    if (progress && total > 0) {
      const completed = progress.completedModules ?? [];
      const exams = Object.values(progress.examScores ?? {});
      const allExamsPassed = exams.length > 0 && exams.every((e) => e.passed);
      const nearly =
        completed.length < total &&
        completed.length >= total - 1 &&
        allExamsPassed;
      const incomplete = completed.length < total && allExamsPassed && exams.length >= Math.max(1, total - 1);
      if (nearly || incomplete || (allExamsPassed && completed.length >= Math.floor(total * 0.9))) {
        await upsertLearnerCourseProgressInStore({
          learnerEmail,
          courseSlug,
          completedModules: Array.from({ length: total }, (_, i) => i + 1),
          examScores: progress.examScores ?? {},
        });
      }
    }

    const result = await grantLearnerCertificateDownloadAccess({
      learnerEmail,
      courseSlug,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    if (!result.granted) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      certificateId: result.certificateId,
      message: result.message,
    });
  } catch (err) {
    console.error("[api/admin/users/issue-certificate]", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Could not issue certificate." },
      { status: 503 },
    );
  }
}
