/** Client-side tutor-led enrollment (localStorage `sft_purchased_courses`). */

import { canonicalCourseSlug } from "@/lib/course-slug-aliases";

export type PurchasedCourseRow = {
  slug?: string;
  title?: string;
  deliveryKind?: "managed" | "tutor-led";
};

export function readPurchasedCourses(): PurchasedCourseRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    const parsed = raw ? (JSON.parse(raw) as PurchasedCourseRow[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isEnrolledInTutorLedProgram(slug: string): boolean {
  const key = slug.trim();
  if (!key) return false;
  return readPurchasedCourses().some((row) => (row.slug ?? "").trim() === key);
}

export function isEnrolledInTutorLedProgramExplicit(slug: string): boolean {
  const key = slug.trim();
  if (!key) return false;
  return readPurchasedCourses().some(
    (row) =>
      (row.slug ?? "").trim() === key &&
      (row.deliveryKind === "tutor-led" || row.deliveryKind === "workshop"),
  );
}

const PURCHASE_EVENTS = ["sft_purchases_updated", "storage"] as const;

/** Subscribe to local purchase changes (for useSyncExternalStore). */
export function subscribeTutorLedPurchases(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  for (const event of PURCHASE_EVENTS) {
    window.addEventListener(event, handler);
  }
  return () => {
    for (const event of PURCHASE_EVENTS) {
      window.removeEventListener(event, handler);
    }
  };
}

export function isCoursePurchased(slug: string): boolean {
  const key = canonicalCourseSlug(slug);
  if (!key) return false;
  return readPurchasedCourses().some((row) => canonicalCourseSlug(row.slug ?? "") === key);
}
