/**
 * Prefer smooth UX on every device. Heavy WebGL / confetti / infinite CSS
 * loops are opt-in only for clearly capable desktops.
 */

export type ClientPerfMode = "high" | "low";

const PERF_ATTR = "data-perf";

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Default to low (smooth). Only mark high when the machine is clearly strong
 * desktop-class hardware — phones and older PCs stay in low mode.
 */
export function detectClientPerfMode(): ClientPerfMode {
  if (typeof window === "undefined") return "low";

  if (prefersReducedMotion()) return "low";

  const nav = navigator as NavigatorWithMemory;
  if (nav.connection?.saveData) return "low";

  const effectiveType = nav.connection?.effectiveType;
  if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g") {
    return "low";
  }

  const cores = nav.hardwareConcurrency ?? 0;
  const memoryGb = nav.deviceMemory;
  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  } catch {
    coarsePointer = false;
  }

  // Touch / phone / tablet → always low (smooth first)
  if (coarsePointer) return "low";

  // Need a solid desktop: 6+ cores and (if known) 8GB+ RAM
  if (cores < 6) return "low";
  if (typeof memoryGb === "number" && memoryGb < 8) return "low";

  return "high";
}

/** Always allow galaxy / starfield — shown on every device. */
export function canUseHeavyVisualEffects(): boolean {
  return true;
}

export function applyClientPerfMode(mode?: ClientPerfMode): ClientPerfMode {
  if (typeof document === "undefined") return mode ?? "low";
  const resolved = mode ?? detectClientPerfMode();
  document.documentElement.setAttribute(PERF_ATTR, resolved);
  return resolved;
}

export function getAppliedClientPerfMode(): ClientPerfMode {
  if (typeof document === "undefined") return "low";
  const attr = document.documentElement.getAttribute(PERF_ATTR);
  return attr === "high" ? "high" : "low";
}
