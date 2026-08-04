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

const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Push local progress to the server (debounced). */
export function pushLearnerCourseProgressToServer(courseSlug: string): void {
  if (typeof window === "undefined") return;
  const slug = canonicalCourseSlug(courseSlug);
  if (!slug) return;
  const prev = pushTimers.get(slug);
  if (prev) clearTimeout(prev);
  pushTimers.set(
    slug,
    setTimeout(() => {
      pushTimers.delete(slug);
      void pushLearnerCourseProgressToServerNow(slug);
    }, 400),
  );
}

export async function pushLearnerCourseProgressToServerNow(
  courseSlug: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const email = getLearnerEmail()?.trim();
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return false;

  try {
    const res = await fetch("/api/learner/course-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        slug,
        completedModules: readCompletedModules(slug),
        examScores: readModuleExamScores(slug),
      }),
    });
    const data = await readJsonResponse(res, {} as { ok?: boolean });
    return res.ok && data.ok === true;
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
    if (!res.ok || !data.ok || !data.progress) {
      // Still push local progress so the server learns about this learner.
      pushLearnerCourseProgressToServer(slug);
      return null;
    }

    const { completedModules, examScores } = data.progress;
    let changed = false;

    if (completedModules.length > 0) {
      const existing = new Set(readCompletedModules(slug));
      const merged = Array.from(new Set([...existing, ...completedModules])).sort((a, b) => a - b);
      if (merged.length !== existing.size || merged.some((n) => !existing.has(n))) {
        writeCompletedModules(slug, merged, merged.length, { skipServerPush: true });
        changed = true;
      }
    }

    if (examScores && Object.keys(examScores).length > 0) {
      const local = readModuleExamScores(slug);
      const next: Record<string, ModuleExamScore> = { ...local };
      for (const [key, score] of Object.entries(examScores)) {
        const prev = next[key];
        if (!prev?.passed && score.passed) {
          next[key] = score;
          changed = true;
        } else if (!prev) {
          next[key] = score;
          changed = true;
        } else if ((score.percent ?? 0) > (prev.percent ?? 0)) {
          next[key] = { ...score, passed: score.passed || prev.passed };
          changed = true;
        }
      }
      if (changed) {
        window.localStorage.setItem(examScoresStorageKey(slug), JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: slug } }),
        );
      }
    }

    // Always push merged local+server state so neither side loses progress.
    pushLearnerCourseProgressToServer(slug);

    if (changed) {
      notifyCourseProgressUpdated(slug);
    }

    return data.progress;
  } catch {
    return null;
  }
}

/** Pull server progress for every enrolled course (My Learning dashboard). */
export async function syncAllLearnerCourseProgressFromServer(
  courseSlugs: string[],
): Promise<void> {
  const unique = Array.from(
    new Set(courseSlugs.map((s) => canonicalCourseSlug(s)).filter(Boolean)),
  );
  await Promise.all(unique.map((slug) => syncLearnerCourseProgressFromServer(slug)));
}
