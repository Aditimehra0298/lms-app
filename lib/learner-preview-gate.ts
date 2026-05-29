import type { CourseCurriculumItem, CourseCurriculumModule } from "@/lib/content-schema";

export const PREVIEW_WATCH_UPDATED_EVENT = "sft-preview-watch-updated";

/** Learner player may use a looser curriculum shape from API JSON. */
export type PreviewGateModule = Pick<CourseCurriculumModule, "items" | "subModules"> & {
  title?: string;
};

export function moduleCurriculumRows(module?: PreviewGateModule): CourseCurriculumItem[] {
  const top = Array.isArray(module?.items) ? module.items : [];
  const nested = (module?.subModules ?? []).flatMap((sm) =>
    Array.isArray(sm.items) ? sm.items : [],
  );
  return [...top, ...nested];
}

/** Effective preview seconds per video (preview limit capped by lesson length when known). */
export function effectivePreviewSecondsForVideo(row: CourseCurriculumItem): number {
  if (row.kind !== "video") return 0;
  const previewMin = Math.max(0, Number(row.previewLimitMinutes) || 0);
  if (previewMin === 0) return 0;
  const lessonMin = Math.max(0, Number(row.lessonDurationMinutes) || 0);
  const effectiveMin = lessonMin > 0 ? Math.min(previewMin, lessonMin) : previewMin;
  return Math.round(effectiveMin * 60);
}

export function requiredPreviewSecondsForModule(module?: PreviewGateModule): number {
  return moduleCurriculumRows(module)
    .filter((row) => row.kind === "video")
    .reduce((sum, row) => sum + effectivePreviewSecondsForVideo(row), 0);
}

export function previewWatchStorageKey(courseSlug: string): string {
  return `sft_module_watched_seconds_${courseSlug.trim()}`;
}

export function readModuleWatchedSeconds(courseSlug: string): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(previewWatchStorageKey(courseSlug));
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const normalized: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed ?? {})) {
      const idx = Number.parseInt(k, 10);
      if (!Number.isFinite(idx) || idx < 1) continue;
      const sec = Number(v);
      if (!Number.isFinite(sec) || sec < 0) continue;
      normalized[idx] = sec;
    }
    return normalized;
  } catch {
    return {};
  }
}

export function writeModuleWatchedSeconds(
  courseSlug: string,
  record: Record<number, number>,
): void {
  try {
    window.localStorage.setItem(previewWatchStorageKey(courseSlug), JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent(PREVIEW_WATCH_UPDATED_EVENT, { detail: { courseSlug } }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function modulePreviewProgress(
  module: PreviewGateModule | undefined,
  watchedSec: number,
): { watched: number; required: number; unlocked: boolean } {
  const watched = Math.max(0, watchedSec);
  const required = requiredPreviewSecondsForModule(module);
  if (required === 0) return { watched, required, unlocked: true };
  return { watched, required, unlocked: watched >= required };
}

export function formatPreviewWatchProgress(watchedSec: number, requiredSec: number): string {
  const watchedMin = Math.floor(watchedSec / 60);
  const requiredMin = Math.max(1, Math.ceil(requiredSec / 60));
  return `${Math.min(watchedMin, requiredMin)} / ${requiredMin} min`;
}

/** Longest watchable runtime in a module (sum of lesson durations when set). */
export function maxWatchableSecondsForModule(module?: PreviewGateModule): number {
  return moduleCurriculumRows(module)
    .filter((row) => row.kind === "video")
    .reduce((sum, row) => sum + Math.max(0, Number(row.lessonDurationMinutes) || 0) * 60, 0);
}

/**
 * If a learner already watched all available video but was blocked by an inflated preview limit,
 * grant unlock without forcing a full rewatch.
 */
export function healModuleWatchRecord(
  module: PreviewGateModule | undefined,
  watchedSec: number,
): number {
  const watched = Math.max(0, watchedSec);
  const progress = modulePreviewProgress(module, watched);
  if (progress.unlocked || progress.required === 0) return watched;

  const maxWatchable = maxWatchableSecondsForModule(module);
  if (maxWatchable <= 0) return watched;

  if (watched >= Math.max(maxWatchable - 15, maxWatchable * 0.92)) {
    return progress.required;
  }
  return watched;
}
