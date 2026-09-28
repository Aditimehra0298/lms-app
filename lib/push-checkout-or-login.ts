/**
 * Tutor-led enrollment flow:
 * 1. Browse `/tutor-led/[slug]` (no login required)
 * 2. Register / Reserve on template → login or register if needed
 * 3. After auth → checkout (payment)
 * 4. After payment → live course dashboard (`/my-learning/course/[slug]`)
 */
import {
  hasViewedCourseLanding,
  markCourseLandingViewed,
  tutorLedLandingHref,
} from "@/lib/course-landing";
import { liveTutorCourseHref, resolveTutorLedSlug, tutorLedTemplatePath } from "@/lib/tutor-led-routes";

export type AppPush = { push: (href: string) => void };

export const tutorLedProgramPath = tutorLedTemplatePath;

export function parseBuyNowSlugs(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      const decoded = decodeURIComponent(trimmed).trim();
      if (decoded) out.push(decoded);
    } catch {
      out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

export const checkoutBuyNowPath = (slug: string) =>
  `/checkout?buyNow=${encodeURIComponent(resolveTutorLedSlug(slug))}`;

/** Checkout every live batch in one cart (2+ items already get the bundle discount). */
export function checkoutBuyNowBundlePath(slugs: string[]): string {
  const list = [...new Set(slugs.map((s) => resolveTutorLedSlug(s)).filter(Boolean))];
  if (list.length === 0) return "/checkout";
  if (list.length === 1) return checkoutBuyNowPath(list[0]);
  return `/checkout?buyNow=${list.map((s) => encodeURIComponent(s)).join(",")}`;
}

function isLoggedInLearner() {
  return typeof window !== "undefined" && window.localStorage.getItem("sft_logged_in") === "true";
}

/** Open the public program template — guests and logged-in users both see course details first. */
export function openTutorLedProgram(router: AppPush, slug: string) {
  if (typeof window === "undefined") return;
  router.push(liveTutorCourseHref(slug));
}

/**
 * Register / pay from the template: logged-in → checkout; guest → account, then checkout.
 */
export function registerTutorLedFromTemplate(router: AppPush, slug: string) {
  if (typeof window === "undefined") return;
  const resolved = resolveTutorLedSlug(slug);
  if (!hasViewedCourseLanding(resolved)) {
    router.push(tutorLedLandingHref(resolved, true));
    return;
  }
  const checkout = checkoutBuyNowPath(resolved);
  if (!isLoggedInLearner()) {
    router.push(`/account?mode=login&redirect=${encodeURIComponent(checkout)}`);
    return;
  }
  router.push(checkout);
}

/** Enroll in every catalog batch in a single checkout. */
export function registerTutorLedBundle(router: AppPush, slugs: string[]) {
  if (typeof window === "undefined") return;
  const list = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (list.length === 0) return;
  if (list.length === 1) {
    registerTutorLedFromTemplate(router, list[0]);
    return;
  }
  for (const slug of list) markCourseLandingViewed(slug);
  const checkout = checkoutBuyNowBundlePath(list);
  if (!isLoggedInLearner()) {
    router.push(`/account?mode=login&redirect=${encodeURIComponent(checkout)}`);
    return;
  }
  router.push(checkout);
}

/** @deprecated Use openTutorLedProgram */
export const pushTutorLedProgramOrLogin = openTutorLedProgram;

/** @deprecated Use registerTutorLedFromTemplate */
export const pushCheckoutOrLogin = registerTutorLedFromTemplate;
