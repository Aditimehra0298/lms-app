"use client";

import type { ShopCartItem } from "@/lib/shop-cart";
import { appendEnrollmentsFromCheckout } from "@/lib/enrollment-storage";
import { clearAbandonedCartSentFlag } from "@/lib/abandoned-cart-client";
import { syncEnrollmentsToServer } from "@/lib/enrollment-sync-client";
import { tutorLedLearnerJoinHref } from "@/lib/tutor-led-routes";
import {
  applyTutorLedShopMeta,
  fetchTutorLedProgramsClient,
  tutorLedProgramBySlug,
} from "@/lib/shop-cart";
import { syncLiveTrainingCalendarReminders } from "@/lib/learner-workshop-calendar";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  countCurriculumModules,
  deriveCourseProgress,
  findCatalogCourse,
} from "@/lib/learner-course-progress";

export type PurchasedLearningCourse = {
  slug: string;
  title: string;
  modules: number;
  duration: string;
  completed: number;
  status: string;
  action: string;
  tone: string;
  deliveryKind?: "managed" | "tutor-led" | "workshop";
  image?: string;
};

export type CompleteCheckoutResult = {
  /** When set, caller should hard-navigate instead of showing success UI. */
  redirectHref?: string;
  purchasedCourses: PurchasedLearningCourse[];
};

export async function completeCheckoutPurchase(
  items: ShopCartItem[],
): Promise<CompleteCheckoutResult> {
  let catalog: ManagedCourse[] = [];
  let tutorPrograms: Awaited<ReturnType<typeof fetchTutorLedProgramsClient>> = [];
  try {
    const [coursesRes, programs] = await Promise.all([
      fetch("/api/courses", { cache: "no-store" }),
      fetchTutorLedProgramsClient(),
    ]);
    tutorPrograms = programs;
    if (coursesRes.ok) {
      const data = (await coursesRes.json()) as { courses?: ManagedCourse[] };
      catalog = Array.isArray(data.courses) ? data.courses : [];
    }
  } catch {
    catalog = [];
    tutorPrograms = [];
  }

  const normalizedItems = items.map((item) => applyTutorLedShopMeta(item, tutorPrograms));

  const purchasedCourses: PurchasedLearningCourse[] = normalizedItems.map((item) => {
    const managed = findCatalogCourse(item, catalog);
    const modulesFromCatalog = managed ? countCurriculumModules(managed.curriculum) : 0;
    const modules = item.learningModules ?? (modulesFromCatalog > 0 ? modulesFromCatalog : 1);
    const duration = item.learningDuration ?? managed?.duration?.trim() ?? "—";
    const { status, action } = deriveCourseProgress(0, modules);
    return {
      slug: item.slug,
      title: managed?.title?.trim() || item.title,
      modules,
      duration,
      completed: 0,
      status:
        item.deliveryKind === "tutor-led" || item.deliveryKind === "workshop" ? "In Progress" : status,
      action: item.learningAction ?? action,
      tone: item.learningTone ?? "violet",
      deliveryKind: item.deliveryKind,
      image: item.image ?? managed?.image?.trim(),
    };
  });

  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    const existing = raw ? (JSON.parse(raw) as PurchasedLearningCourse[]) : [];
    const merged = [...purchasedCourses, ...existing].filter(
      (course, index, all) => all.findIndex((item) => item.slug === course.slug) === index,
    );
    window.localStorage.setItem("sft_purchased_courses", JSON.stringify(merged));
    window.localStorage.setItem("sft_cart", JSON.stringify([]));
    clearAbandonedCartSentFlag();
    window.dispatchEvent(new Event("sft_purchases_updated"));
    window.dispatchEvent(new Event("sft_cart_updated"));
    window.dispatchEvent(new Event("sft_purchased_courses_updated"));
    syncLiveTrainingCalendarReminders(normalizedItems, tutorPrograms);
  } catch {
    /* keep UI flow */
  }

  try {
    appendEnrollmentsFromCheckout(normalizedItems.map((item) => ({ slug: item.slug, title: item.title })));
  } catch {
    /* best-effort */
  }

  const tutorLedItem =
    normalizedItems.find((i) => i.deliveryKind === "tutor-led" || i.deliveryKind === "workshop") ??
    normalizedItems.find((i) => tutorLedProgramBySlug(tutorPrograms, i.slug));
  if (tutorLedItem?.slug) {
    void syncEnrollmentsToServer();
    return {
      redirectHref: tutorLedLearnerJoinHref(tutorLedItem.slug),
      purchasedCourses,
    };
  }

  await syncEnrollmentsToServer();
  return { purchasedCourses };
}
