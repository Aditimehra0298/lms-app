import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import type { CourseLearningFormat } from "@/lib/content-schema";

/** Primary demo / cyber tutor-led program slug (public template). */
export const DEFAULT_TUTOR_LED_SLUG = "advanced-cyber-security-professional";

const publishedTutorLedSlugs = new Set(
  defaultTutorLedPrograms.filter((p) => p.published).map((p) => p.slug),
);

export function tutorLedTemplatePath(slug: string) {
  return `/tutor-led/${encodeURIComponent(slug)}`;
}

export function resolveTutorLedSlug(slug?: string | null): string {
  const trimmed = slug?.trim();
  if (trimmed && publishedTutorLedSlugs.has(trimmed)) return trimmed;
  return DEFAULT_TUTOR_LED_SLUG;
}

/**
 * First step for live tutor-led: open the designed marketing template (no login).
 * Use on Register / Join / course cards for interactive & live formats.
 */
export function liveTutorCourseHref(slug?: string | null): string {
  return tutorLedTemplatePath(resolveTutorLedSlug(slug));
}

/** Catalog browse link: self-paced → course page; interactive/live → tutor-led template. */
export function courseBrowseHref(
  slug: string,
  learningFormat?: CourseLearningFormat | null,
  categorySlug?: string | null,
): string {
  const cat = categorySlug?.toLowerCase() ?? "";
  const isLiveCategory = cat === "cyber-security" || cat === "information-security";
  if (learningFormat === "interactive" || learningFormat === "live" || isLiveCategory) {
    return liveTutorCourseHref(slug);
  }
  return `/courses/${encodeURIComponent(slug)}`;
}
