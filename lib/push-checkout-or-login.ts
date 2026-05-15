/**
 * Tutor-led enrollment flow:
 * 1. Browse `/tutor-led/[slug]` (no login required)
 * 2. Register / Reserve on template → login or register if needed
 * 3. After auth → checkout (payment)
 * 4. After payment → My Learning → Tutor Led (checkout success screen)
 */
import { liveTutorCourseHref, resolveTutorLedSlug, tutorLedTemplatePath } from "@/lib/tutor-led-routes";

export type AppPush = { push: (href: string) => void };

export const tutorLedProgramPath = tutorLedTemplatePath;

export const checkoutBuyNowPath = (slug: string) =>
  `/checkout?buyNow=${encodeURIComponent(resolveTutorLedSlug(slug))}`;

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
  const checkout = checkoutBuyNowPath(slug);
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
