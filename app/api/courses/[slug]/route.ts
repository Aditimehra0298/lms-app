import { NextResponse } from "next/server";
import { getManagedCourseBySlug } from "@/lib/server/course-catalog";

export const dynamic = "force-dynamic";

/** Published course payload for learner flows (exam player, etc.). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const course = await getManagedCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    slug: course.slug,
    title: course.title,
    curriculum: course.curriculum ?? null,
    finalExam: course.finalExam ?? null,
  });
}
