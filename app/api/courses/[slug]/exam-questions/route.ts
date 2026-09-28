import { NextResponse } from "next/server";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";
import { loadExamQuestionsFromStoredUrl } from "@/lib/server/load-exam-questions";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";
import { getTutorLedProgramForLearner } from "@/lib/server/tutor-led-catalog";
import { requireLearnerSessionEmail } from "@/lib/server/learner-session";
import { findExistingEnrollment } from "@/lib/server/enrollment-lookup";
import { prisma } from "@/lib/prisma";
import { resolveTutorLedBatchExam, syncProgramBatchFromSchedule } from "@/lib/tutor-led-batches";

export const dynamic = "force-dynamic";

/** GET ?module=1 — questions for that module's uploaded exam CSV only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module") ?? "1";
  const isFinal = moduleParam === "final" || searchParams.get("final") === "1";

  const course = await getManagedCourseForLearner(slug);

  if (isFinal) {
    const fe = course?.finalExam;
    const tutorLedRaw = course ? null : await getTutorLedProgramForLearner(slug);
    const tutorLed = tutorLedRaw ? syncProgramBatchFromSchedule(tutorLedRaw) : null;
    let batchExamUrl = "";
    let batchExamTitle = "";
    let batchMinutes: number | undefined;
    let batchPass: number | undefined;
    let batchTimed: boolean | undefined;
    if (tutorLed) {
      const email = requireLearnerSessionEmail(request);
      let batchId: string | undefined;
      if (email) {
        const purchase = await prisma.lmsPurchase.findFirst({
          where: { courseSlug: slug.trim().toLowerCase(), learnerEmail: email },
          select: { batchKey: true, examUploadUrl: true },
        });
        if (!purchase) {
          const existing = await findExistingEnrollment({ learnerEmail: email, courseSlug: slug });
          if (existing) {
            const row = await prisma.lmsPurchase.findUnique({
              where: { id: existing.id },
              select: { batchKey: true, examUploadUrl: true },
            });
            batchId = row?.batchKey ?? undefined;
            batchExamUrl = row?.examUploadUrl?.trim() || "";
          }
        } else {
          batchId = purchase.batchKey ?? undefined;
          batchExamUrl = purchase.examUploadUrl?.trim() || "";
        }
      }
      const resolved = resolveTutorLedBatchExam(tutorLed, batchId);
      batchExamUrl = batchExamUrl || resolved.examUploadUrl;
      batchExamTitle = resolved.examTitle;
      batchMinutes = resolved.examMinutes;
      batchPass = resolved.examPassingScore;
      batchTimed = resolved.examTimed;
    }
    const examUploadUrl =
      fe?.examUploadUrl?.trim() || batchExamUrl || "";
    const title =
      fe?.title?.trim() ||
      batchExamTitle ||
      "Final examination";
    const passingScorePercent =
      typeof fe?.passingScorePercent === "number"
        ? fe.passingScorePercent
        : batchPass ?? 70;

    if (!examUploadUrl) {
      return NextResponse.json({
        ok: false,
        message: "The final exam is not available yet. Please check back soon.",
      });
    }

    const questions = await loadExamQuestionsFromStoredUrl(examUploadUrl);
    if (questions.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "This exam could not be loaded. Please try again later.",
      });
    }

    return NextResponse.json({
      ok: true,
      moduleNumber: "final",
      moduleTitle: title,
      examLabel: title,
      passingScorePercent,
      timedExam: fe?.timedExam ?? batchTimed ?? true,
      examDurationMinutes: fe?.examDurationMinutes ?? batchMinutes ?? 60,
      questions,
    });
  }

  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found" }, { status: 404 });
  }

  const moduleNumber = Math.max(1, Number.parseInt(moduleParam, 10) || 1);
  const curriculum = normalizeCurriculumModules(
    getCurriculumForCourse(course.slug, course.category, course.title, course.curriculum),
  );
  const moduleIdx = moduleNumber - 1;
  const mod = curriculum[moduleIdx];
  if (!mod) {
    return NextResponse.json({ ok: false, message: "Module not found" }, { status: 404 });
  }

  const examRow = getFirstExamRowInModule(mod);
  const examUploadUrl = examRow?.examUploadUrl?.trim();
  if (!examRow || !examUploadUrl) {
    return NextResponse.json({
      ok: false,
      message: "This module exam is not available yet. Please check back soon.",
      moduleNumber,
      moduleTitle: mod.title,
    });
  }

  const questions = await loadExamQuestionsFromStoredUrl(examUploadUrl);
  if (questions.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "This exam could not be loaded. Please try again later.",
      moduleNumber,
      moduleTitle: mod.title,
    });
  }

  return NextResponse.json({
    ok: true,
    moduleNumber,
    moduleTitle: mod.title,
    examLabel: examRow.label?.trim() || `Module ${moduleNumber} examination`,
    passingScorePercent:
      typeof examRow.examPassingScorePercent === "number" ? examRow.examPassingScorePercent : 70,
    timedExam: !!examRow.timedExam,
    examDurationMinutes: examRow.examDurationMinutes,
    questions,
  });
}
