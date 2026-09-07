import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import {
  examModuleNumbers,
  FINAL_EXAM_SCORE_KEY,
  learnerCredentialsEligible,
} from "@/lib/learner-exam-scores";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { findExistingEnrollment } from "@/lib/server/enrollment-lookup";
import { getLearnerCourseProgressFromStore } from "@/lib/server/learner-course-progress-store";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";
import { readAdminSessionEmail } from "@/lib/server/admin-session";
import { NextResponse } from "next/server";

/**
 * Learner may request a certificate only when enrolled and (when curriculum exists)
 * server-stored progress shows completion / passed exams.
 */
export async function assertLearnerMayRequestCertificate(
  learnerEmail: string,
  courseSlug: string,
): Promise<{ ok: true; scorePercent?: number } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(learnerEmail);
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) {
    return { ok: false, message: "Email and course slug are required." };
  }

  const enrolled = await findExistingEnrollment({ learnerEmail: email, courseSlug: slug });
  if (!enrolled) {
    return {
      ok: false,
      message: "You must be enrolled in this course before requesting a certificate.",
    };
  }

  const courses = await getManagedCourses();
  const course = courses.find((c) => canonicalCourseSlug(c.slug) === slug);
  const curriculum = Array.isArray(course?.curriculum) ? course!.curriculum : [];

  /** No structured curriculum (e.g. some tutor-led) — enrollment is enough. */
  if (curriculum.length === 0) {
    return { ok: true };
  }

  const progress = await getLearnerCourseProgressFromStore(email, slug);
  if (!progress) {
    return {
      ok: false,
      message:
        "Complete the course and pass required exams first. Progress was not found on the server.",
    };
  }

  const examNums = examModuleNumbers(curriculum);
  let allExamsPassed = examNums.length > 0;
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const moduleNumber of examNums) {
    const entry = progress.examScores?.[String(moduleNumber)];
    if (!entry?.passed) allExamsPassed = false;
    if (entry) {
      totalCorrect += Number(entry.correct) || 0;
      totalQuestions += Number(entry.total) || 0;
    }
  }

  const finalEntry = progress.examScores?.[FINAL_EXAM_SCORE_KEY];
  if (examNums.length === 0 && finalEntry?.passed) {
    allExamsPassed = true;
    totalCorrect = Number(finalEntry.correct) || 0;
    totalQuestions = Number(finalEntry.total) || 0;
  }

  const { eligible, examsRequired } = learnerCredentialsEligible(
    curriculum,
    progress.completedModules ?? [],
    allExamsPassed,
  );

  if (!eligible) {
    return {
      ok: false,
      message: examsRequired
        ? "Pass all required module exams and complete every module before requesting a certificate."
        : "Complete all course modules before requesting a certificate.",
    };
  }

  const scorePercent =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : finalEntry?.percent != null
        ? Math.round(Number(finalEntry.percent))
        : undefined;

  return { ok: true, scorePercent };
}

/** Session learner who owns the cert, or signed-in main admin. */
export function assertCertificateOwnerOrAdmin(
  request: Request,
  certificateLearnerEmail: string,
): NextResponse | null {
  const owner = normalizeLearnerEmail(certificateLearnerEmail);
  const adminEmail = readAdminSessionEmail(request);
  if (adminEmail && isMainAdminEmail(adminEmail)) return null;

  const sessionEmail = requireLearnerSessionEmail(request);
  if (sessionEmail && owner && sessionEmail === owner) return null;

  if (!sessionEmail && !adminEmail) return learnerAuthRequiredResponse();
  return NextResponse.json(
    { ok: false, message: "You do not have access to this certificate." },
    { status: 403 },
  );
}
