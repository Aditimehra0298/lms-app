/**
 * Client-only enrollment log for the demo app. Checkout appends rows; the admin
 * Students tab reads them. Not a cross-device roster without a server store.
 */
export const ENROLLMENTS_STORAGE_KEY = "sft_course_enrollments";
export const ENROLLMENTS_UPDATED_EVENT = "sft_enrollments_updated";

export type StoredCourseEnrollment = {
  courseSlug: string;
  learnerEmail: string;
  learnerName?: string;
  enrolledAt: string;
};

export function readEnrollments(): StoredCourseEnrollment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ENROLLMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCourseEnrollment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CheckoutItem = { slug: string; title: string };

export function appendEnrollmentsFromCheckout(items: CheckoutItem[]): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const email =
    window.localStorage.getItem("sft_learner_email")?.trim().toLowerCase() || "guest@demo.local";
  const nameRaw = window.localStorage.getItem("sft_learner_name")?.trim();
  const now = new Date().toISOString();
  const existing = readEnrollments();
  const added: StoredCourseEnrollment[] = items.map((item) => ({
    courseSlug: item.slug,
    learnerEmail: email,
    learnerName: nameRaw || undefined,
    enrolledAt: now,
  }));
  window.localStorage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify([...added, ...existing]));
  window.dispatchEvent(new Event(ENROLLMENTS_UPDATED_EVENT));
}
