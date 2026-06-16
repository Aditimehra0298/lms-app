import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  notifyCourseProgressUpdated,
  writeCompletedModules,
} from "@/lib/learner-course-progress";
import type { ModuleExamScore } from "@/lib/learner-exam-scores";
import { examScoresStorageKey, readModuleExamScores } from "@/lib/learner-exam-scores";
import { readJsonResponse } from "@/lib/safe-json";
import type { StoredLearnerCourseProgress } from "@/lib/server/learner-course-progress-store";

/** Merge server-stored progress (admin/script) into browser localStorage. */
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
      const existing = new Set(
        JSON.parse(
          window.localStorage.getItem(`sft_completed_modules_${slug}`) || "[]",
        ) as number[],
      );
      const merged = Array.from(new Set([...existing, ...completedModules])).sort((a, b) => a - b);
      if (merged.length !== existing.size || merged.some((n) => !existing.has(n))) {
        writeCompletedModules(slug, merged, merged.length);
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
        }
      }
      if (changed) {
        window.localStorage.setItem(examScoresStorageKey(slug), JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: slug } }),
        );
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
