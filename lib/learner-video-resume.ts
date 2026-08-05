/** Per-lesson video resume position (seconds) — survives page refresh. */

const STORAGE_PREFIX = "sft_video_resume_v1_";

export function videoResumeStorageKey(
  courseSlug: string,
  moduleNumber: number,
  entryIdx: number,
): string {
  return `${STORAGE_PREFIX}${courseSlug.trim()}_${moduleNumber}_${entryIdx}`;
}

export function readVideoResumeSeconds(
  courseSlug: string,
  moduleNumber: number,
  entryIdx: number,
): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      videoResumeStorageKey(courseSlug, moduleNumber, entryIdx),
    );
    const sec = Number(raw);
    if (!Number.isFinite(sec) || sec < 0) return 0;
    return sec;
  } catch {
    return 0;
  }
}

export function writeVideoResumeSeconds(
  courseSlug: string,
  moduleNumber: number,
  entryIdx: number,
  seconds: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const sec = Math.max(0, Math.floor(seconds));
    if (sec < 2) {
      window.localStorage.removeItem(
        videoResumeStorageKey(courseSlug, moduleNumber, entryIdx),
      );
      return;
    }
    window.localStorage.setItem(
      videoResumeStorageKey(courseSlug, moduleNumber, entryIdx),
      String(sec),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearVideoResumeSeconds(
  courseSlug: string,
  moduleNumber: number,
  entryIdx: number,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(
      videoResumeStorageKey(courseSlug, moduleNumber, entryIdx),
    );
  } catch {
    // ignore
  }
}

export function formatVideoClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}
