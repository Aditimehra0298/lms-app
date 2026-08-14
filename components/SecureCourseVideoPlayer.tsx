"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveProtectedMediaUrl } from "@/lib/media-client";
import { formatVideoClock } from "@/lib/learner-video-resume";

const REFRESH_MS = 2 * 60 * 1000;
/** Offer resume when learner left past this many seconds. */
const RESUME_MIN_SECONDS = 5;
/** Treat near-end as finished (no resume prompt). */
const RESUME_END_MARGIN_SECONDS = 8;

type Props = {
  storedUrl: string;
  courseSlug: string;
  className?: string;
  /** Saved playback position when returning to this lesson. */
  resumeAtSeconds?: number;
  onTimeUpdate?: (video: HTMLVideoElement) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  /** Fired when learner chooses Continue or Restart (after seek). */
  onResumeChoice?: (choice: "continue" | "restart", atSeconds: number) => void;
};

function tokenFromPlayUrl(url: string): string | null {
  try {
    return new URL(url, window.location.origin).searchParams.get("t");
  } catch {
    return null;
  }
}

/** Hardened learner video — short-lived signed URLs, resume prompt, no download UI. */
export function SecureCourseVideoPlayer({
  storedUrl,
  courseSlug,
  className = "",
  resumeAtSeconds = 0,
  onTimeUpdate,
  onEnded,
  onError,
  onResumeChoice,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playUrlRef = useRef("");
  const onErrorRef = useRef(onError);
  const resumeOfferedForUrl = useRef("");
  const [playUrl, setPlayUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [resumePrompt, setResumePrompt] = useState<{ at: number } | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // New lesson / URL → clear overlay; may re-offer after metadata loads.
  useEffect(() => {
    setResumePrompt(null);
    resumeOfferedForUrl.current = "";
  }, [storedUrl, resumeAtSeconds]);

  const applyPlayUrl = useCallback((nextUrl: string) => {
    const video = videoRef.current;
    const prevUrl = playUrlRef.current;
    playUrlRef.current = nextUrl;

    if (video && prevUrl && nextUrl && tokenFromPlayUrl(prevUrl) !== tokenFromPlayUrl(nextUrl)) {
      const resumeAt = video.currentTime;
      const wasPlaying = !video.paused && !video.ended;
      video.src = nextUrl;
      video.currentTime = resumeAt;
      if (wasPlaying) void video.play().catch(() => {});
    }

    setPlayUrl(nextUrl);
  }, []);

  const fetchPlayUrl = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const trimmed = storedUrl.trim();
      if (!trimmed) {
        applyPlayUrl("");
        if (opts?.showLoading) setLoading(false);
        return;
      }
      if (opts?.showLoading) setLoading(true);
      try {
        const url = await resolveProtectedMediaUrl(trimmed, {
          courseSlug,
          scope: "learner",
        });
        if (!url) {
          onErrorRef.current?.("This video must be uploaded to protected course storage.");
          applyPlayUrl("");
          return;
        }
        applyPlayUrl(url);
      } catch {
        onErrorRef.current?.("Could not authorize video playback.");
        applyPlayUrl("");
      } finally {
        if (opts?.showLoading) setLoading(false);
      }
    },
    [storedUrl, courseSlug, applyPlayUrl],
  );

  useEffect(() => {
    playUrlRef.current = "";
    setPlayUrl("");
    void fetchPlayUrl({ showLoading: true });

    const interval = window.setInterval(() => {
      void fetchPlayUrl({ showLoading: false });
    }, REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [fetchPlayUrl]);

  useEffect(() => {
    const blockSaveKeys = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s" || key === "u" || key === "p") {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", blockSaveKeys);
    return () => window.removeEventListener("keydown", blockSaveKeys);
  }, []);

  // Blank / pause when tab is hidden (screenshot tools, app switch, screen share).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const blank = () => {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") blank();
    };
    const onBlur = () => blank();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [playUrl]);

  const maybeOfferResume = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playUrl) return;
    if (resumeOfferedForUrl.current === storedUrl.trim()) return;

    const at = Math.max(0, resumeAtSeconds);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (at < RESUME_MIN_SECONDS) return;
    if (duration > 0 && at >= duration - RESUME_END_MARGIN_SECONDS) return;

    resumeOfferedForUrl.current = storedUrl.trim();
    video.pause();
    setResumePrompt({ at });
  }, [playUrl, resumeAtSeconds, storedUrl]);

  const chooseContinue = () => {
    const video = videoRef.current;
    const at = resumePrompt?.at ?? resumeAtSeconds;
    setResumePrompt(null);
    if (video) {
      try {
        video.currentTime = at;
      } catch {
        /* ignore */
      }
      void video.play().catch(() => {});
    }
    onResumeChoice?.("continue", at);
  };

  const chooseRestart = () => {
    const video = videoRef.current;
    setResumePrompt(null);
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      void video.play().catch(() => {});
    }
    onResumeChoice?.("restart", 0);
  };

  if (!storedUrl.trim()) return null;

  const showPlaceholder = loading && !playUrl;

  return (
    <div
      className="relative select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {showPlaceholder ? (
        <div
          className={`flex items-center justify-center bg-black text-xs text-gray-500 ${className}`}
          aria-hidden
        >
          Loading video…
        </div>
      ) : null}
      {playUrl ? (
        <video
          ref={videoRef}
          src={playUrl}
          controls={!resumePrompt}
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          playsInline
          preload="metadata"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={() => maybeOfferResume()}
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget)}
          onEnded={() => onEnded?.()}
          onError={() => {
            onErrorRef.current?.("Video could not load. Check enrollment or re-upload in Admin.");
          }}
          className={`${className}${showPlaceholder ? " hidden" : ""}`}
        />
      ) : !showPlaceholder ? (
        <div
          className={`flex items-center justify-center bg-black px-4 text-center text-xs text-gray-500 ${className}`}
        >
          Video unavailable
        </div>
      ) : null}

      {resumePrompt ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0c1324] p-5 shadow-2xl">
            <p className="text-sm font-semibold text-white">Continue watching?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
              You left this video at{" "}
              <span className="font-semibold text-violet-200">
                {formatVideoClock(resumePrompt.at)}
              </span>
              . Resume from there, or start over.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={chooseContinue}
                className="flex-1 rounded-lg bg-violet-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-400"
              >
                Continue from {formatVideoClock(resumePrompt.at)}
              </button>
              <button
                type="button"
                onClick={chooseRestart}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-100 hover:bg-white/10"
              >
                Restart from beginning
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
