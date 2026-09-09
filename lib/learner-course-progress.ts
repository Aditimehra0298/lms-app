import type {
  CourseCurriculumModule,
  LearningCourseStatus,
  ManagedCourse,
} from "@/lib/content-schema";
import { canonicalCourseSlug, isAliasCourseSlug } from "@/lib/course-slug-aliases";
import { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";
import { isGenericCoursePlaceholder, resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import { readModuleWatchedSeconds } from "@/lib/learner-preview-gate";
import {
  computeCombinedExamGrade,
  examModuleNumbers,
  learnerCredentialsEligible,
  readModuleExamScores,
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
  deliveryKind?: "managed" | "tutor-led" | "workshop";
  image?: string;
};

export const COURSE_PROGRESS_UPDATED_EVENT = "sft-course-progress-updated";

function completedModulesStorageKey(slug: string): string {
  const s = slug.trim();
  let email = "";
  try {
    email = (window.localStorage.getItem("sft_learner_email") || "").trim().toLowerCase();
  } catch {
    email = "";
  }
  return email ? `sft_completed_modules_${email}_${s}` : `sft_completed_modules_${s}`;
}

export function readCompletedModules(slug: string): number[] {
  if (typeof window === "undefined" || !slug.trim()) return [];
  try {
    const raw = window.localStorage.getItem(completedModulesStorageKey(slug));
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

export { countLearnerCurriculumModules } from "@/lib/curriculum-learner-filter";

export function deriveCourseProgress(
  completed: number,
  total: number,
): { status: LearningCourseStatus; action: string } {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal || completed);
  if (safeTotal <= 0) {
    return { status: "Not Started", action: "Start Course" };
  }
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
  const slug = canonicalCourseSlug(row.slug?.trim());
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
  const slug = canonicalCourseSlug(row.slug ?? catalog?.slug ?? "");
  const completedFromStorage = slug ? trustedCompletedModules(slug, catalog?.curriculum).length : 0;
  const modulesFromCatalog = catalog ? countLearnerCurriculumModules(catalog.curriculum) : 0;
  const modules = modulesFromCatalog > 0 ? modulesFromCatalog : Math.max(0, row.modules || 0);
  const duration = catalog?.duration?.trim() || row.duration?.trim() || "—";
  const title = catalog?.title?.trim() || row.title?.trim() || "Course";
  // Prefer catalog cover / hero for this course — never keep a shared placeholder
  // stuck in localStorage purchase rows (that made every card look identical).
  const image = catalog
    ? resolveCourseListThumbnail(catalog) || ""
    : isGenericCoursePlaceholder(row.image)
      ? ""
      : row.image?.trim() || "";
  const completedRaw = slug ? completedFromStorage : Math.min(row.completed ?? 0, modules);
  const completed = modules > 0 ? Math.min(completedRaw, modules) : completedRaw;
  let { status, action } = deriveCourseProgress(completed, modules);

  if (slug && catalog?.curriculum?.length && (action === "View Certificate" || status === "Completed")) {
    const completedModules = trustedCompletedModules(slug, catalog.curriculum);
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

/** True when every module is marked done but the learner never sat a required exam. */
export function isUnverifiedFullCompletion(
  slug: string,
  curriculum?: CourseCurriculumModule[] | null,
): boolean {
  if (typeof window === "undefined" || !slug.trim() || !curriculum?.length) return false;
  const completed = readCompletedModules(slug);
  const total = countLearnerCurriculumModules(curriculum);
  if (total < 1 || completed.length < total) return false;
  const examNums = examModuleNumbers(curriculum);
  const hasExamAttempt = Object.keys(readModuleExamScores(slug)).length > 0;
  if (hasExamAttempt) return false;
  if (examNums.length > 0) return true;
  const watched = readModuleWatchedSeconds(slug);
  return !Object.values(watched).some((sec) => Number(sec) > 0);
}

/** Completed modules that belong to this learner — ignore copied 100% with no exam attempts. */
export function trustedCompletedModules(
  slug: string,
  curriculum?: CourseCurriculumModule[] | null,
): number[] {
  if (isUnverifiedFullCompletion(slug, curriculum)) return [];
  return readCompletedModules(slug);
}

/** Clear fake 100% progress and save that to the server. */
export function clearUnverifiedFullCompletion(
  slug: string,
  curriculum?: CourseCurriculumModule[] | null,
): boolean {
  if (!isUnverifiedFullCompletion(slug, curriculum)) return false;
  writeCompletedModules(slug, [], countLearnerCurriculumModules(curriculum), {
    replaceServer: true,
  });
  return true;
}

export function writeCompletedModules(
  slug: string,
  moduleNumbers: number[],
  totalModules?: number,
  opts?: { skipServerPush?: boolean; replaceServer?: boolean },
) {
  if (typeof window === "undefined" || !slug.trim()) return;
  const clean = Array.from(
    new Set(moduleNumbers.filter((n) => Number.isFinite(n) && n > 0)),
  ).sort((a, b) => a - b);
  try {
    window.localStorage.setItem(completedModulesStorageKey(slug), JSON.stringify(clean));
    syncPurchasedCourseProgress(slug, clean.length, totalModules);
    notifyCourseProgressUpdated(slug);
    if (!opts?.skipServerPush) {
      void import("@/lib/learner-progress-sync-client").then((m) => {
        m.pushLearnerCourseProgressToServer(slug, {
          replaceCompletedModules: opts?.replaceServer === true,
        });
      });
    }
  } catch {
    // Ignore storage failures.
  }
}

/** Heal legacy progress (e.g. 9-module counts on a 5-module course) so completion UI unlocks. */
export function normalizeCompletedModulesForCurriculum(
  slug: string,
  moduleCount: number,
): number[] {
  if (typeof window === "undefined" || !slug.trim() || moduleCount <= 0) {
    return readCompletedModules(slug);
  }
  const existing = readCompletedModules(slug);
  const inRange = Array.from(
    new Set(existing.filter((n) => Number.isFinite(n) && n >= 1 && n <= moduleCount)),
  ).sort((a, b) => a - b);
  if (inRange.length >= moduleCount) {
    const full = Array.from({ length: moduleCount }, (_, i) => i + 1);
    const needsHeal = !full.every((n) => existing.includes(n));
    if (needsHeal) writeCompletedModules(slug, full, moduleCount);
    return full;
  }
  return existing;
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

/** Merge MySQL enrollments into browser storage so My Learning shows server-side purchases. */
export function mergeServerEnrollmentsIntoStorage(
  serverCourses: Array<{ slug: string; title: string }>,
  tutorLedSlugs?: Set<string>,
): number {
  if (typeof window === "undefined" || serverCourses.length === 0) return 0;

  const existing = readPurchasedCoursesFromStorage();
  const bySlug = new Map<string, PurchasedCourseRow>();
  let changed = 0;

  for (const row of existing) {
    const rawSlug = (row.slug ?? "").trim().toLowerCase();
    if (!rawSlug) continue;
    const slug = canonicalCourseSlug(rawSlug);
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { ...row, slug });
      if (slug !== rawSlug) changed += 1;
      continue;
    }
    if ((prev.completed ?? 0) < (row.completed ?? 0)) {
      bySlug.set(slug, { ...row, slug });
      changed += 1;
    }
  }

  for (const aliasSlug of existing.map((r) => (r.slug ?? "").trim().toLowerCase()).filter(isAliasCourseSlug)) {
    const canonical = canonicalCourseSlug(aliasSlug);
    if (canonical === aliasSlug) continue;
    try {
      const completed = window.localStorage.getItem(completedModulesStorageKey(aliasSlug));
      if (completed && !window.localStorage.getItem(completedModulesStorageKey(canonical))) {
        window.localStorage.setItem(completedModulesStorageKey(canonical), completed);
        changed += 1;
      }
      const scores = window.localStorage.getItem(`sft_module_exam_scores_${aliasSlug}`);
      if (scores && !window.localStorage.getItem(`sft_module_exam_scores_${canonical}`)) {
        window.localStorage.setItem(`sft_module_exam_scores_${canonical}`, scores);
        changed += 1;
      }
    } catch {
      /* ignore */
    }
  }

  for (const course of serverCourses) {
    const slug = canonicalCourseSlug(course.slug);
    if (!slug || bySlug.has(slug)) continue;

    const isTutorLed = tutorLedSlugs?.has(slug) ?? false;
    bySlug.set(slug, {
      slug,
      title: course.title.trim() || slug,
      modules: 0,
      duration: "—",
      completed: 0,
      status: isTutorLed ? "In Progress" : "Not Started",
      action: isTutorLed ? "Continue" : "Start Course",
      tone: "violet",
      deliveryKind: isTutorLed ? "tutor-led" : "managed",
    });
    changed += 1;
  }

  if (changed === 0) return 0;

  try {
    window.localStorage.setItem("sft_purchased_courses", JSON.stringify([...bySlug.values()]));
    window.dispatchEvent(new Event("sft_purchases_updated"));
  } catch {
    return 0;
  }

  return changed;
}

/** Do not auto-complete modules just because a certificate row exists. */
export function ensureCompletedModulesForCertificate(
  _courseSlug: string,
  _moduleCount: number,
): void {
  return;
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
      ? countLearnerCurriculumModules(catalogCourse.curriculum)
      : bySlug.get(slug)?.modules || 0;
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
        image: catalogCourse
          ? resolveCourseListThumbnail(catalogCourse) || ""
          : bySlug.get(slug)?.image || "",
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
