import type { CourseLearningFormat } from "@/lib/content-schema";
import {
  courseBrowseHref,
  hasPublishedTutorLedProgram,
  liveTutorCourseHref,
} from "@/lib/tutor-led-routes";

/** Client catalog: pass tutor-led slugs from `/api/tutor-led/programs`. */
export function catalogCourseLandingHref(
  slug: string,
  tutorLedSlugs: ReadonlySet<string>,
  learningFormat?: CourseLearningFormat | null,
): string {
  return courseBrowseHref(slug, learningFormat);
}

export { hasPublishedTutorLedProgram };

const VIEWED_KEY = "sft_landing_viewed_";

/** Public marketing / detail page URL (before payment). */
export function courseLandingHref(
  slug: string,
  learningFormat?: CourseLearningFormat | null,
  categorySlug?: string | null,
  enrollIntent?: boolean,
): string {
  const base = courseBrowseHref(slug, learningFormat, categorySlug);
  return enrollIntent ? `${base}${base.includes("?") ? "&" : "?"}enroll=1` : base;
}

export function tutorLedLandingHref(slug: string, enrollIntent?: boolean): string {
  const base = liveTutorCourseHref(slug);
  return enrollIntent ? `${base}?enroll=1` : base;
}

export function markCourseLandingViewed(slug: string): void {
  if (typeof window === "undefined") return;
  const key = slug.trim().toLowerCase();
  if (!key) return;
  sessionStorage.setItem(`${VIEWED_KEY}${key}`, "1");
}

export function hasViewedCourseLanding(slug: string): boolean {
  if (typeof window === "undefined") return false;
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  return sessionStorage.getItem(`${VIEWED_KEY}${key}`) === "1";
}
