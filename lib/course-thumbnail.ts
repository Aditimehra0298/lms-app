import type { ManagedCourse } from "@/lib/content-schema";

/** Shared defaults used when a course is created / AI-imported without a real cover. */
const GENERIC_PLACEHOLDERS = new Set([
  "",
  "/course-food-safety.png",
  "/course-food-safety.jpg",
]);

export function isGenericCoursePlaceholder(src: string | undefined | null): boolean {
  const s = (src ?? "").trim();
  if (!s) return true;
  return GENERIC_PLACEHOLDERS.has(s);
}

type ThumbSource = {
  image?: string | null;
  hero?: {
    previewImage?: string | null;
    backgroundImage?: string | null;
    certificatePreviewImage?: string | null;
  } | null;
  certificateConfig?: {
    templateImage?: string | null;
    badgeImage?: string | null;
  } | null;
  slug?: string | null;
  title?: string | null;
};

/**
 * My Learning / catalog card thumbnail for one course.
 * Prefer that course's own cover, hero, or certificate art — never the shared food-safety placeholder.
 */
export function resolveCourseListThumbnail(course: ThumbSource | null | undefined): string {
  if (!course) return "";
  const candidates = [
    course.image,
    course.hero?.previewImage,
    course.hero?.backgroundImage,
    course.hero?.certificatePreviewImage,
    course.certificateConfig?.badgeImage,
    course.certificateConfig?.templateImage,
  ];
  for (const raw of candidates) {
    const s = (raw ?? "").trim();
    if (!s || isGenericCoursePlaceholder(s)) continue;
    return s;
  }
  return "";
}

export function resolveManagedCourseThumbnail(course: ManagedCourse): string {
  return resolveCourseListThumbnail(course);
}
