import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import type { CourseLearningFormat } from "@/lib/content-schema";
import { ISO_22000_PROGRAM_SLUGS } from "@/lib/iso-22000-tutor-led-seed";
import { hasPublishedWorkshopProgram, workshopLandingHref } from "@/lib/workshop-program";

/**
 * Legacy seed slug (cyber demo). Prefer the catalog index for generic CTAs.
 * Kept only for checkout/learner helpers that still need a non-empty slug fallback.
 */
export const DEFAULT_TUTOR_LED_SLUG = "advanced-cyber-security-professional";

/** Public catalog landing — Admin → Tutor-Led Landing + live programs from Tutor Led. */
export const TUTOR_LED_CATALOG_HREF = "/tutor-led";

/** Designed ISO 22000 food tutor-led catalog (opens from Food category thumbnails). */
export const TUTOR_LED_ISO_22000_CATALOG_HREF = "/tutor-led/iso-22000";

/** Single catalog card slug — not a per-level program. */
export const ISO_22000_CATALOG_SLUG = "iso-22000";

const publishedTutorLedSlugs = new Set([
  ...defaultTutorLedPrograms.filter((p) => p.published).map((p) => p.slug),
  ...Object.values(ISO_22000_PROGRAM_SLUGS),
]);

export function tutorLedTemplatePath(slug: string) {
  return `/tutor-led/${encodeURIComponent(slug)}`;
}

/** Whether a known published tutor-led marketing page exists for this slug (static seeds). */
export function hasPublishedTutorLedProgram(slug: string): boolean {
  const key = slug?.trim();
  return Boolean(key && publishedTutorLedSlugs.has(key));
}

/** For checkout / enroll — keep the real program slug (admin-created programs included). */
export function resolveTutorLedSlug(slug?: string | null): string {
  const trimmed = slug?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_TUTOR_LED_SLUG;
}

/**
 * Link to a tutor-led marketing page, or the catalog when no slug is given.
 */
export function liveTutorCourseHref(slug?: string | null): string {
  const key = slug?.trim();
  if (!key) return TUTOR_LED_CATALOG_HREF;
  return tutorLedTemplatePath(key);
}

const iso22000Slugs = new Set<string>(Object.values(ISO_22000_PROGRAM_SLUGS));

export function isIso22000TutorLedSlug(slug?: string | null): boolean {
  const key = slug?.trim() ?? "";
  return key === ISO_22000_CATALOG_SLUG || iso22000Slugs.has(key);
}

/** Description / catalog click — ISO 22000 levels open the designed food landing. */
export function tutorLedDescriptionHref(slug?: string | null): string {
  if (isIso22000TutorLedSlug(slug)) return TUTOR_LED_ISO_22000_CATALOG_HREF;
  return liveTutorCourseHref(slug);
}

/** Enrolled learner hub: live join, recordings, and cohort materials. */
export function tutorLedLearnerJoinHref(slug?: string | null): string {
  return `/my-learning/course/${encodeURIComponent(resolveTutorLedSlug(slug))}`;
}

/** Learner hub scrolled to the in-LMS Zoom join card (never a raw zoom.us link). */
export function tutorLedLearnerLiveJoinHref(slug?: string | null): string {
  return `${tutorLedLearnerJoinHref(slug)}#zoom-live`;
}

/** Organisation admin opens live join for a specific team member (separate attendee context). */
export function tutorLedOrgEmployeeJoinHref(
  slug: string,
  employeeId: string,
  employeeName?: string | null,
): string {
  const params = new URLSearchParams({ orgEmployee: employeeId.trim() });
  const name = employeeName?.trim();
  if (name) params.set("as", name);
  return `${tutorLedLearnerJoinHref(slug)}?${params.toString()}#zoom-live`;
}

/** Live join entry — opens the program hub Zoom classroom card (never a raw zoom.us bypass). */
export function tutorLedLiveZoomHref(slug?: string | null): string {
  return `${tutorLedLearnerJoinHref(slug)}#zoom-live`;
}

/**
 * Pre-payment marketing page:
 * - tutor-led program slug → `/tutor-led/[slug]` (designed live template)
 * - self-paced / unknown slug → `/courses/[slug]` (designed self-paced template)
 */
export function courseBrowseHref(
  slug: string,
  learningFormat?: CourseLearningFormat | null,
  _categorySlug?: string | null,
): string {
  const key = slug.trim();
  if (!key) return "/courses";

  if (learningFormat === "self-paced") {
    return `/courses/${encodeURIComponent(key)}`;
  }

  if (learningFormat === "live") {
    return liveTutorCourseHref(key);
  }

  if (hasPublishedWorkshopProgram(key)) {
    return workshopLandingHref(key);
  }

  if (hasPublishedTutorLedProgram(key)) {
    return liveTutorCourseHref(key);
  }

  return `/courses/${encodeURIComponent(key)}`;
}
