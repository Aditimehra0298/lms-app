import type {
  CourseCurriculumModule,
  LearningCourseStatus,
  ManagedCourse,
} from "@/lib/content-schema";
import {
  computeCombinedExamGrade,
  learnerCredentialsEligible,
} from "@/lib/learner-exam-scores";

export type PurchasedCourseRow = {
  slug?: string;
  title: string;
  modules: number;
  duration: string;
  completed: number;
  status: string;
  action: string;
  tone: string;
  deliveryKind?: "managed" | "tutor-led";
  image?: string;
};

export const COURSE_PROGRESS_UPDATED_EVENT = "sft-course-progress-updated";

export function readCompletedModules(slug: string): number[] {
  if (typeof window === "undefined" || !slug.trim()) return [];
  try {
    const raw = window.localStorage.getItem(`sft_completed_modules_${slug.trim()}`);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((n) => Number.isFinite(n) && n > 0)
      : [];
  } catch {
    return [];
  }
}

export function countCurriculumModules(curriculum?: CourseCurriculumModule[] | null): number {
  if (!Array.isArray(curriculum) || curriculum.length === 0) return 0;
  return curriculum.length;
}

export function deriveCourseProgress(
  completed: number,
  total: number,
): { status: LearningCourseStatus; action: string } {
  const safeTotal = Math.max(1, total);
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal);
  if (safeCompleted >= safeTotal) {
    return { status: "Completed", action: "View Certificate" };
  }
  if (safeCompleted <= 0) {
    return { status: "Not Started", action: "Start Course" };
  }
  return { status: "In Progress", action: "Continue" };
}

export function findCatalogCourse(
  row: { slug?: string; title: string },
  catalog: ManagedCourse[],
): ManagedCourse | undefined {
  const slug = row.slug?.trim();
  if (slug) {
    const bySlug = catalog.find((c) => c.slug === slug);
    if (bySlug) return bySlug;
  }
  const titleKey = row.title.trim().toLowerCase();
  return catalog.find((c) => c.title.trim().toLowerCase() === titleKey);
}

export function enrichPurchasedCourse(
  row: PurchasedCourseRow,
  catalog: ManagedCourse | undefined,
): PurchasedCourseRow {
  const slug = (row.slug ?? catalog?.slug ?? "").trim();
  const completedFromStorage = slug ? readCompletedModules(slug).length : 0;
  const modulesFromCatalog = catalog ? countCurriculumModules(catalog.curriculum) : 0;
  const modules = modulesFromCatalog > 0 ? modulesFromCatalog : Math.max(1, row.modules || 1);
  const duration = catalog?.duration?.trim() || row.duration?.trim() || "—";
  const title = catalog?.title?.trim() || row.title?.trim() || "Course";
  const image = catalog?.image?.trim() || row.image?.trim() || "";
  const completed = slug ? completedFromStorage : Math.min(row.completed ?? 0, modules);
  let { status, action } = deriveCourseProgress(completed, modules);

  if (slug && catalog?.curriculum?.length && (action === "View Certificate" || status === "Completed")) {
    const completedModules = readCompletedModules(slug);
    const { allExamsPassed } = computeCombinedExamGrade(slug, catalog.curriculum);
    const { eligible } = learnerCredentialsEligible(catalog.curriculum, completedModules, allExamsPassed);
    if (!eligible) {
      status = "In Progress";
      action = "Continue";
    }
  }

  return {
    ...row,
    slug: slug || row.slug,
    title,
    modules,
    duration,
    completed,
    status,
    action,
    image,
  };
}

export function notifyCourseProgressUpdated(courseSlug: string) {
  if (typeof window === "undefined" || !courseSlug.trim()) return;
  window.dispatchEvent(
    new CustomEvent(COURSE_PROGRESS_UPDATED_EVENT, { detail: { courseSlug: courseSlug.trim() } }),
  );
}

export function writeCompletedModules(slug: string, moduleNumbers: number[], totalModules?: number) {
  if (typeof window === "undefined" || !slug.trim()) return;
  const clean = Array.from(
    new Set(moduleNumbers.filter((n) => Number.isFinite(n) && n > 0)),
  ).sort((a, b) => a - b);
  try {
    window.localStorage.setItem(`sft_completed_modules_${slug.trim()}`, JSON.stringify(clean));
    syncPurchasedCourseProgress(slug, clean.length, totalModules);
    notifyCourseProgressUpdated(slug);
  } catch {
    // Ignore storage failures.
  }
}

export function markModuleCompleted(
  slug: string,
  moduleNumber: number,
  totalModules?: number,
  badge?: {
    courseTitle: string;
    moduleTitle: string;
    badgeImageUrl?: string;
  },
) {
  const existing = readCompletedModules(slug);
  if (existing.includes(moduleNumber)) return;
  writeCompletedModules(slug, [...existing, moduleNumber], totalModules);
  if (badge && typeof window !== "undefined") {
    void import("@/lib/learner-badges").then(({ awardModuleBadge }) => {
      awardModuleBadge({
        courseSlug: slug,
        courseTitle: badge.courseTitle,
        moduleNumber,
        moduleTitle: badge.moduleTitle,
        badgeImageUrl: badge.badgeImageUrl,
      });
    });
  }
}

export function syncPurchasedCourseProgress(slug: string, completed: number, totalModules?: number) {
  if (typeof window === "undefined" || !slug.trim()) return;
  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    const parsed = raw ? (JSON.parse(raw) as PurchasedCourseRow[]) : [];
    if (!Array.isArray(parsed)) return;
    const idx = parsed.findIndex((c) => (c.slug ?? "").trim() === slug.trim());
    if (idx < 0) return;
    const modules = totalModules ?? parsed[idx].modules;
    const { status, action } = deriveCourseProgress(completed, modules);
    const prev = parsed[idx];
    if (
      prev.completed === completed &&
      prev.modules === modules &&
      prev.status === status &&
      prev.action === action
    ) {
      return;
    }
    parsed[idx] = { ...prev, completed, modules, status, action };
    window.localStorage.setItem("sft_purchased_courses", JSON.stringify(parsed));
    window.dispatchEvent(new Event("sft_purchases_updated"));
  } catch {
    // Ignore storage failures.
  }
}

export function readPurchasedCoursesFromStorage(): PurchasedCourseRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    const parsed = raw ? (JSON.parse(raw) as PurchasedCourseRow[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Mark all modules complete in localStorage when a certificate exists in DB. */
export function ensureCompletedModulesForCertificate(
  courseSlug: string,
  moduleCount: number,
): void {
  if (typeof window === "undefined" || !courseSlug.trim() || moduleCount < 1) return;
  const slug = courseSlug.trim();
  const existing = readCompletedModules(slug);
  const all = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const hasAll = all.every((n) => existing.includes(n));
  if (!hasAll) {
    writeCompletedModules(slug, all, moduleCount);
  }
}

/** Merge server certificates into purchased courses so progress/dashboard shows completed work. */
export function mergeCertificatesIntoPurchasedCourses(
  rows: PurchasedCourseRow[],
  certificates: Array<{
    courseSlug: string;
    courseTitle: string;
    status?: string;
    visibleToLearner?: boolean;
  }>,
  catalog: ManagedCourse[],
): PurchasedCourseRow[] {
  const bySlug = new Map<string, PurchasedCourseRow>();
  for (const row of rows) {
    const slug = row.slug?.trim();
    if (slug) bySlug.set(slug, row);
  }

  for (const cert of certificates) {
    const slug = cert.courseSlug?.trim();
    if (!slug) continue;
    if (cert.status !== "ready" && cert.status !== "pending") continue;

    const catalogCourse = findCatalogCourse({ slug, title: cert.courseTitle }, catalog);
    const modules = catalogCourse
      ? countCurriculumModules(catalogCourse.curriculum)
      : bySlug.get(slug)?.modules || 3;
    const safeModules = Math.max(1, modules);

    ensureCompletedModulesForCertificate(slug, safeModules);

    const enriched = enrichPurchasedCourse(
      {
        slug,
        title: cert.courseTitle,
        modules: safeModules,
        duration: catalogCourse?.duration?.trim() || bySlug.get(slug)?.duration || "—",
        completed: safeModules,
        status: "Completed",
        action: "View Certificate",
        tone: "emerald",
        deliveryKind: "managed",
        image: catalogCourse?.image?.trim() || bySlug.get(slug)?.image || "",
      },
      catalogCourse,
    );
    bySlug.set(slug, enriched);
  }

  const merged = Array.from(bySlug.values());
  if (typeof window !== "undefined" && merged.length > rows.length) {
    try {
      window.localStorage.setItem("sft_purchased_courses", JSON.stringify(merged));
      window.dispatchEvent(new Event("sft_purchases_updated"));
    } catch {
      /* ignore */
    }
  }

  return merged;
}
