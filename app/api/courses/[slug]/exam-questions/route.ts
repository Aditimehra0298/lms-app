import { NextResponse } from "next/server";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";
import { loadExamQuestionsFromStoredUrl } from "@/lib/server/load-exam-questions";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";

export const dynamic = "force-dynamic";

/** GET ?module=1 — questions for that module's uploaded exam CSV only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const moduleNumber = Math.max(1, Number.parseInt(searchParams.get("module") ?? "1", 10) || 1);

  const course = await getManagedCourseForLearner(slug);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found" }, { status: 404 });
  }

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
