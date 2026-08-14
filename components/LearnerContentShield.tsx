"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra label shown on the blackout panel */
  label?: string;
};

function pauseMediaIn(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll("video, audio").forEach((el) => {
    const media = el as HTMLMediaElement;
    try {
      media.pause();
    } catch {
      /* ignore */
    }
  });
}

function isScreenshotChord(event: KeyboardEvent): boolean {
  if (event.key === "PrintScreen" || event.code === "PrintScreen") return true;
  const key = event.key.toLowerCase();
  // macOS screenshots
  if (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key)) return true;
  // Common “save / print” chords while learning
  if ((event.ctrlKey || event.metaKey) && (key === "p" || key === "s")) return true;
  // Windows Snipping Tool chord (when the page still receives it)
  if (event.shiftKey && (event.metaKey || event.getModifierState?.("OS")) && key === "s") {
    return true;
  }
  return false;
}

/**
 * Best-effort LMS content shield: blacks out the protected region and pauses
 * media when the tab is hidden, the window blurs, or screenshot shortcuts fire.
 * True OS-level capture blackout (Netflix-style) requires hardware DRM; this
 * blocks casual screenshots / share-screen attempts in the browser.
 */
export default function LearnerContentShield({
  children,
  className = "",
  label = "Protected content",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState<string>("");
  const forceUntilRef = useRef(0);
  const blurTimerRef = useRef<number | null>(null);

  const engage = useCallback((nextReason: string, holdMs = 0) => {
    const until = Date.now() + holdMs;
    if (until > forceUntilRef.current) forceUntilRef.current = until;
    setReason(nextReason);
    setBlocked(true);
    pauseMediaIn(rootRef.current);
  }, []);

  const releaseIfAllowed = useCallback(() => {
    if (Date.now() < forceUntilRef.current) return;
    if (document.visibilityState !== "visible") return;
    if (!document.hasFocus()) return;
    setBlocked(false);
    setReason("");
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        engage("Tab hidden — content locked", 800);
      } else {
        window.setTimeout(releaseIfAllowed, 120);
      }
    };

    const onBlur = () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      // Short delay avoids flicker when opening native controls inside the page.
      blurTimerRef.current = window.setTimeout(() => {
        if (!document.hasFocus() || document.visibilityState !== "visible") {
          engage("Window inactive — content locked", 600);
        }
      }, 180);
    };

    const onFocus = () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      window.setTimeout(releaseIfAllowed, 120);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isScreenshotChord(event)) return;
      event.preventDefault();
      engage("Screenshot / capture blocked", 2800);
      try {
        void navigator.clipboard?.writeText?.("");
      } catch {
        /* ignore */
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      event.preventDefault();
    };

    const onCopy = (event: ClipboardEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      event.preventDefault();
    };

    // If this page starts a display capture (rare), lock immediately.
    const originalGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(
      navigator.mediaDevices,
    );
    if (navigator.mediaDevices && originalGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = ((...args: Parameters<typeof originalGetDisplayMedia>) => {
        engage("Screen capture detected — content locked", 5000);
        return originalGetDisplayMedia(...args);
      }) as typeof navigator.mediaDevices.getDisplayMedia;
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("copy", onCopy, true);

    // Keep media paused while blocked (user may press play under the overlay).
    const interval = window.setInterval(() => {
      if (!blocked && Date.now() >= forceUntilRef.current) return;
      if (document.visibilityState === "hidden" || !document.hasFocus() || Date.now() < forceUntilRef.current) {
        pauseMediaIn(rootRef.current);
      }
    }, 700);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("copy", onCopy, true);
      window.clearInterval(interval);
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      if (navigator.mediaDevices && originalGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
    };
  }, [blocked, engage, releaseIfAllowed]);

  // Hold-timer expiry → try release
  useEffect(() => {
    if (!blocked) return;
    const left = Math.max(0, forceUntilRef.current - Date.now());
    const t = window.setTimeout(releaseIfAllowed, left + 50);
    return () => window.clearTimeout(t);
  }, [blocked, reason, releaseIfAllowed]);

  return (
    <div
      ref={rootRef}
      className={`learner-content-shield relative isolate min-w-0 select-none ${className}`}
      data-shield={blocked ? "blocked" : "clear"}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={
          blocked
            ? "pointer-events-none select-none opacity-0"
            : "min-w-0"
        }
        aria-hidden={blocked || undefined}
      >
        {children}
      </div>

      {blocked ? (
        <div
          className="absolute inset-0 z-[80] flex min-h-[240px] flex-col items-center justify-center bg-black px-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-label="Content protected"
        >
          <p className="text-sm font-semibold tracking-wide text-white">{label}</p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
            Screenshots and screen recording are not allowed in the learner player. Return focus to
            this tab to continue.
          </p>
          {reason ? <p className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600">{reason}</p> : null}
          <button
            type="button"
            className="mt-5 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            onClick={() => {
              forceUntilRef.current = 0;
              releaseIfAllowed();
            }}
          >
            I&apos;m back — unlock
          </button>
        </div>
      ) : null}
    </div>
  );
}
