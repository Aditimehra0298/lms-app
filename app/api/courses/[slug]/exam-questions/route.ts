import { NextResponse } from "next/server";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";
import { loadExamQuestionsFromStoredUrl } from "@/lib/server/load-exam-questions";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";
import { getTutorLedProgramForLearner } from "@/lib/server/tutor-led-catalog";
import { resolveLearnerSection } from "@/lib/tutor-led-learner-section";

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
    const tutorLed = course ? null : await getTutorLedProgramForLearner(slug);
    const tutorSection = tutorLed ? resolveLearnerSection(tutorLed) : null;
    const examUploadUrl =
      fe?.examUploadUrl?.trim() || tutorSection?.examUploadUrl?.trim() || "";
    const title =
      fe?.title?.trim() ||
      tutorSection?.finalExamTitle?.trim() ||
      "Final examination";
    const passingScorePercent =
      typeof fe?.passingScorePercent === "number"
        ? fe.passingScorePercent
        : tutorSection?.examPassingScore ?? 70;

    if (!examUploadUrl) {
      return NextResponse.json({
        ok: false,
        message: "No final exam file uploaded in Admin. Upload a CSV on the course or tutor-led learner dashboard.",
      });
    }

    const questions = await loadExamQuestionsFromStoredUrl(examUploadUrl);
    if (questions.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Exam file could not be read or has no valid questions.",
        examUploadUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      moduleNumber: "final",
      moduleTitle: title,
      examLabel: title,
      passingScorePercent,
      timedExam: fe?.timedExam ?? true,
      examDurationMinutes: fe?.examDurationMinutes ?? tutorSection?.examMinutes ?? 60,
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
  if (!examUploadUrl) {
    return NextResponse.json({
      ok: false,
      message: "No exam file uploaded for this module in Admin. Add a Module Exam and upload your CSV.",
      moduleNumber,
      moduleTitle: mod.title,
    });
  }

  const questions = await loadExamQuestionsFromStoredUrl(examUploadUrl);
  if (questions.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "Exam file could not be read or has no valid questions. Check the CSV format in Admin.",
      moduleNumber,
      moduleTitle: mod.title,
      examUploadUrl,
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
