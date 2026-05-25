import type { ManagedCourse, ManagedCourseTabLabels } from "@/lib/content-schema";

export type ResolvedTabLabels = {
  overview: string;
  curriculum: string;
  instructor: string;
  reviews: string;
  qa: string;
};

export function sanitizeTabLabels(raw: ManagedCourseTabLabels | undefined): ManagedCourseTabLabels | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    overview: raw.overview?.trim(),
    curriculum: raw.curriculum?.trim(),
    instructor: raw.instructor?.trim(),
    reviews: raw.reviews?.trim(),
    qa: raw.qa?.trim(),
  };
}

export function resolveTabLabels(course: ManagedCourse): ResolvedTabLabels {
  const t = course.tabLabels;
  return {
    overview: t?.overview?.trim() || "Overview",
    curriculum: t?.curriculum?.trim() || "Course Content",
    instructor: t?.instructor?.trim() || "Instructor",
    reviews: t?.reviews?.trim() || "Reviews",
    qa: t?.qa?.trim() || "Q&A",
  };
}
