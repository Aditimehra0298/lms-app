import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import type { CourseLearningFormat } from "@/lib/content-schema";
import { hasPublishedWorkshopProgram, workshopLandingHref } from "@/lib/workshop-program";

/** Primary demo / cyber tutor-led program slug (public template). */
export const DEFAULT_TUTOR_LED_SLUG = "advanced-cyber-security-professional";

const publishedTutorLedSlugs = new Set(
  defaultTutorLedPrograms.filter((p) => p.published).map((p) => p.slug),
);

export function tutorLedTemplatePath(slug: string) {
  return `/tutor-led/${encodeURIComponent(slug)}`;
}

/** Whether a published tutor-led marketing page exists for this slug. */
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
 * Link to the tutor-led marketing page (exact slug).
 * Use only when {@link hasPublishedTutorLedProgram} is true, or for generic CTAs with no slug.
 */
export function liveTutorCourseHref(slug?: string | null): string {
  const key = slug?.trim();
  if (!key) return tutorLedTemplatePath(DEFAULT_TUTOR_LED_SLUG);
  return tutorLedTemplatePath(key);
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
