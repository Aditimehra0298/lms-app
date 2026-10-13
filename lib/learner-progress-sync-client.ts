import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  notifyCourseProgressUpdated,
  readCompletedModules,
  writeCompletedModules,
} from "@/lib/learner-course-progress";
import type { ModuleExamScore } from "@/lib/learner-exam-scores";
import { examScoresStorageKey, readModuleExamScores } from "@/lib/learner-exam-scores";
import { readApiResult, readJsonResponse } from "@/lib/safe-json";
import type { StoredLearnerCourseProgress } from "@/lib/server/learner-course-progress-store";

const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Push local progress to the server (debounced). */
export function pushLearnerCourseProgressToServer(
  courseSlug: string,
  opts?: { replaceCompletedModules?: boolean },
): void {
  if (typeof window === "undefined") return;
  const slug = canonicalCourseSlug(courseSlug);
  if (!slug) return;
  const prev = pushTimers.get(slug);
  if (prev) clearTimeout(prev);
  pushTimers.set(
    slug,
    setTimeout(() => {
      pushTimers.delete(slug);
      void pushLearnerCourseProgressToServerNow(slug, opts);
    }, 400),
  );
}

export async function pushLearnerCourseProgressToServerNow(
  courseSlug: string,
  opts?: { replaceCompletedModules?: boolean },
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const email = getLearnerEmail()?.trim();
  const slug = canonicalCourseSlug(courseSlug);
  if (!email || !slug) return false;

  try {
    const res = await fetch("/api/learner/course-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        slug,
        completedModules: readCompletedModules(slug),
        examScores: readModuleExamScores(slug),
        replaceCompletedModules: opts?.replaceCompletedModules === true,
      }),
    });
    const result = await readApiResult(res, {} as { ok?: boolean });
    return result.ok && result.data.ok === true;
  } catch {
    const { publishApiNotice } = await import("@/lib/api-error");
    publishApiNotice({
      kind: "network",
      message: "Could not save progress. Check your connection and try again.",
    });
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
      `/api/learner/course-progress?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store", credentials: "include" },
    );
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      progress?: StoredLearnerCourseProgress | null;
    });
    if (!res.ok || !data.ok || !data.progress) {
      // Do not upload this browser's leftover progress onto a learner who has none yet.
      return null;
    }
    applyServerProgress(slug, data.progress);
    return data.progress;
  } catch {
    return null;
  }
}

/**
 * Merge one course's server progress into localStorage. Pushes back to the server only when this
 * browser has progress the server is missing — a push per course on every dashboard visit used
 * up the per-learner save rate limit and blocked real lesson saves.
 */
function applyServerProgress(slug: string, progress: StoredLearnerCourseProgress): void {
  const { completedModules, examScores } = progress;
  let changed = false;

  const local = new Set(readCompletedModules(slug));
  const server = new Set(completedModules ?? []);
  let localAhead = Array.from(local).some((n) => !server.has(n));

  if (server.size > 0) {
    const merged = Array.from(new Set([...local, ...server])).sort((a, b) => a - b);
    if (merged.length !== local.size || merged.some((n) => !local.has(n))) {
      writeCompletedModules(slug, merged, merged.length, { skipServerPush: true });
      changed = true;
    }
  }

  const localScores = readModuleExamScores(slug);
  const serverScores = examScores ?? {};
  for (const [key, score] of Object.entries(localScores)) {
    const remote = serverScores[key];
    if (!remote || (score.passed && !remote.passed) || (score.percent ?? 0) > (remote.percent ?? 0)) {
      localAhead = true;
    }
  }

  if (Object.keys(serverScores).length > 0) {
    const next: Record<string, ModuleExamScore> = { ...localScores };
    let scoresChanged = false;
    for (const [key, score] of Object.entries(serverScores)) {
      const prev = next[key];
      if (!prev || (!prev.passed && score.passed)) {
        next[key] = score;
        scoresChanged = true;
      } else if ((score.percent ?? 0) > (prev.percent ?? 0)) {
        next[key] = { ...score, passed: score.passed || prev.passed };
        scoresChanged = true;
      }
    }
    if (scoresChanged) {
      changed = true;
      window.localStorage.setItem(examScoresStorageKey(slug), JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: slug } }));
    }
  }

  if (localAhead) pushLearnerCourseProgressToServer(slug);
  if (changed) notifyCourseProgressUpdated(slug);
}

const SYNC_ALL_MIN_GAP_MS = 15_000;
let syncAllInFlight: Promise<void> | null = null;
let syncAllLast = { key: "", at: 0 };

/** Pull server progress for every enrolled course in one request (My Learning dashboard). */
export function syncAllLearnerCourseProgressFromServer(courseSlugs: string[]): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const unique = Array.from(new Set(courseSlugs.map((s) => canonicalCourseSlug(s)).filter(Boolean))).sort();
  if (unique.length === 0 || !getLearnerEmail()?.trim()) return Promise.resolve();

  const key = unique.join(",");
  if (syncAllInFlight) return syncAllInFlight;
  if (syncAllLast.key === key && Date.now() - syncAllLast.at < SYNC_ALL_MIN_GAP_MS) return Promise.resolve();

  syncAllInFlight = (async () => {
    try {
      const res = await fetch(`/api/learner/course-progress?slugs=${encodeURIComponent(key)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await readJsonResponse(res, {} as {
        ok?: boolean;
        progressBySlug?: Record<string, StoredLearnerCourseProgress | null>;
      });
      if (!res.ok || !data.ok || !data.progressBySlug) return;
      for (const [slug, progress] of Object.entries(data.progressBySlug)) {
        if (progress) applyServerProgress(slug, progress);
      }
      syncAllLast = { key, at: Date.now() };
    } catch {
      /* offline — keep local progress */
    } finally {
      syncAllInFlight = null;
    }
  })();
  return syncAllInFlight;
}
