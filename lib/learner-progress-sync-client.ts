import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  notifyCourseProgressUpdated,
  readCompletedModules,
  writeCompletedModules,
} from "@/lib/learner-course-progress";
import type { ModuleExamScore } from "@/lib/learner-exam-scores";
import { examScoresStorageKey, readModuleExamScores } from "@/lib/learner-exam-scores";
import { readJsonResponse } from "@/lib/safe-json";
import type { StoredLearnerCourseProgress } from "@/lib/server/learner-course-progress-store";

/** Push local progress to the server so My Learning stays accurate across sessions. */
export async function pushLearnerCourseProgressToServer(courseSlug: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const email = getLearnerEmail()?.trim();
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return false;
  try {
    const res = await fetch("/api/learner/course-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        slug,
        completedModules: readCompletedModules(slug),
        examScores: readModuleExamScores(slug),
      }),
    });
    const data = await readJsonResponse(res, {} as { ok?: boolean });
    return Boolean(res.ok && data.ok);
  } catch {
    return false;
  }
}

/** Merge server-stored progress into browser localStorage. */
export async function syncLearnerCourseProgressFromServer(
  courseSlug: string,
): Promise<StoredLearnerCourseProgress | null> {
  if (typeof window === "undefined") return null;
  const email = getLearnerEmail()?.trim();
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return null;

  try {
    const res = await fetch(
      `/api/learner/course-progress?email=${encodeURIComponent(email)}&slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      progress?: StoredLearnerCourseProgress | null;
    });
    if (!res.ok || !data.ok || !data.progress) return null;

    const { completedModules, examScores } = data.progress;
    let changed = false;

    if (completedModules.length > 0) {
      const existing = new Set(readCompletedModules(slug));
      const merged = Array.from(new Set([...existing, ...completedModules])).sort((a, b) => a - b);
      if (merged.length !== existing.size || merged.some((n) => !existing.has(n))) {
        // Avoid recursive server push while merging from server.
        try {
          window.localStorage.setItem(`sft_completed_modules_${slug}`, JSON.stringify(merged));
          const { syncPurchasedCourseProgress, notifyCourseProgressUpdated: notify } =
            await import("@/lib/learner-course-progress");
          syncPurchasedCourseProgress(slug, merged.length, merged.length);
          notify(slug);
        } catch {
          writeCompletedModules(slug, merged, merged.length);
        }
        changed = true;
      }
    }

    if (examScores && Object.keys(examScores).length > 0) {
      const local = readModuleExamScores(slug);
      const next: Record<string, ModuleExamScore> = { ...local };
      let examChanged = false;
      for (const [key, score] of Object.entries(examScores)) {
        const prev = next[key];
        if (!prev?.passed && score.passed) {
          next[key] = score;
          examChanged = true;
        } else if (!prev) {
          next[key] = score;
          examChanged = true;
        }
      }
      if (examChanged) {
        window.localStorage.setItem(examScoresStorageKey(slug), JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: slug } }),
        );
        changed = true;
      }
    }

    if (changed) {
      notifyCourseProgressUpdated(slug);
    }

    return data.progress;
  } catch {
    return null;
  }
}

/** Pull progress for every enrolled course (My Learning dashboard). */
export async function syncAllLearnerCourseProgressFromServer(
  courseSlugs: string[],
): Promise<void> {
  const unique = Array.from(
    new Set(courseSlugs.map((s) => canonicalCourseSlug(s.trim())).filter(Boolean)),
  );
  await Promise.all(unique.map((slug) => syncLearnerCourseProgressFromServer(slug)));
}
