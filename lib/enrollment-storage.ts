/**
 * Client-side enrollment log (backup + legacy). Checkout and sign-in also sync to MySQL;
 * the admin Students tab reads from the database.
 */
import { normalizeLearnerEmail } from "@/lib/learner-email";

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
    normalizeLearnerEmail(window.localStorage.getItem("sft_learner_email") ?? "") || "guest@demo.local";
  const nameRaw = window.localStorage.getItem("sft_learner_name")?.trim();
  const now = new Date().toISOString();
  const existing = readEnrollments();
  const newSlugs = new Set(items.map((item) => item.slug.trim().toLowerCase()));
  const kept = existing.filter(
    (row) =>
      normalizeLearnerEmail(row.learnerEmail) !== email ||
      !newSlugs.has(row.courseSlug.trim().toLowerCase()),
  );
  const added: StoredCourseEnrollment[] = items.map((item) => ({
    courseSlug: item.slug.trim().toLowerCase(),
    learnerEmail: email,
    learnerName: nameRaw || undefined,
    enrolledAt: now,
  }));
  window.localStorage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify([...added, ...kept]));
  window.dispatchEvent(new Event(ENROLLMENTS_UPDATED_EVENT));
  void import("@/lib/enrollment-sync-client").then((m) => m.syncEnrollmentsToServer(email));
}
