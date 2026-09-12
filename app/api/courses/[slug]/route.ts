import { NextResponse } from "next/server";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { resolveCourseHero } from "@/lib/course-hero-resolve";
import { resolveLearningSection } from "@/lib/course-learning-resolve";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";
import { getTutorLedProgramForLearner } from "@/lib/server/tutor-led-catalog";
import { resolveLearnerSection } from "@/lib/tutor-led-learner-section";
import {
  computeCompletedLiveSessions,
  computeProgramProgress,
  getCurriculumSessionCount,
} from "@/lib/tutor-led-training-schedule";
import { parseFlexibleDate } from "@/lib/my-learning-dashboard-events";

export const dynamic = "force-dynamic";

/** Published course payload for learner flows (exam player, etc.). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const course = await getManagedCourseForLearner(slug);
  if (!course) {
    const tutorLed = await getTutorLedProgramForLearner(slug);
    if (!tutorLed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const section = resolveLearnerSection(tutorLed);
    const trainingDays = getCurriculumSessionCount(tutorLed);
    const completedDays = computeCompletedLiveSessions(
      tutorLed.zoomRecordings?.length ?? 0,
      trainingDays,
      parseFlexibleDate(tutorLed.nextBatchDate ?? ""),
    );
    const { examUnlocked } = computeProgramProgress(trainingDays, completedDays);
    return NextResponse.json({
      slug: tutorLed.slug,
      title: tutorLed.title,
      curriculum: null,
      finalExam: {
        title: section.finalExamTitle,
        examUploadUrl: section.examUploadUrl,
        passingScorePercent: section.examPassingScore ?? 70,
        timedExam: section.examTimed !== false,
        examDurationMinutes: section.examTimed === false ? undefined : (section.examMinutes ?? 60),
      },
      deliveryKind: "tutor-led",
      examUnlocked,
      trainingDays,
      completedDays,
    });
  }
  const curriculum = normalizeCurriculumModules(
    getCurriculumForCourse(
      course.slug,
      course.category,
      course.title,
      course.curriculum,
    ),
  );
  const lectureCount = curriculum.reduce((sum, mod) => sum + (mod.items?.length ?? 0), 0);
  const hero = resolveCourseHero(course, lectureCount);
  const learningSection = resolveLearningSection(course, hero.certificatePreviewLabel);
  return NextResponse.json({
    slug: course.slug,
    title: course.title,
    category: course.category,
    curriculum,
    finalExam: course.finalExam ?? null,
    certificatePreviewImage: hero.certificatePreviewImage,
    certificatePreviewLabel: hero.certificatePreviewLabel,
    learningSection,
  });
}
