import { NextResponse } from "next/server";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { resolveCourseHero } from "@/lib/course-hero-resolve";
import { resolveLearningSection } from "@/lib/course-learning-resolve";
import { getManagedCourseForLearner } from "@/lib/server/course-catalog";

export const dynamic = "force-dynamic";

/** Published course payload for learner flows (exam player, etc.). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const course = await getManagedCourseForLearner(slug);
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
