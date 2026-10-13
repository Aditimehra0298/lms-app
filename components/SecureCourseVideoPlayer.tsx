"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BunnyLessonEmbed,
  isBunnyEmbedUrl,
  type LessonPlaybackSample,
  type LessonPlayerApi,
} from "@/components/BunnyLessonEmbed";
import { resolveProtectedMediaUrl } from "@/lib/media-client";
import { formatVideoClock } from "@/lib/learner-video-resume";

/** Max automatic re-authorisations per lesson (expired token on seek / network drop). */
const MAX_RECOVERIES = 5;
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
  onTimeUpdate?: (sample: LessonPlaybackSample) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  /** Fired when learner chooses Continue or Restart (after seek). */
  onResumeChoice?: (choice: "continue" | "restart", atSeconds: number) => void;
};

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
  const bunnyApiRef = useRef<LessonPlayerApi | null>(null);
  const onErrorRef = useRef(onError);
  const recoveringRef = useRef(false);
  const recoveriesRef = useRef(0);
  const pendingSeekRef = useRef<{ at: number; play: boolean } | null>(null);
  const resumeOfferedForUrl = useRef("");
  const mediaKey = `${courseSlug}|${storedUrl.trim()}`;
  const [media, setMedia] = useState<{ key: string; url: string } | null>(null);
  const playUrl = media?.key === mediaKey ? media.url : "";
  const isBunny = isBunnyEmbedUrl(playUrl);
  const loading = Boolean(storedUrl.trim()) && media?.key !== mediaKey;
  const [resumePrompt, setResumePrompt] = useState<{ at: number } | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // New lesson / URL → clear overlay; may re-offer after metadata loads.
  useEffect(() => {
    setResumePrompt(null);
    resumeOfferedForUrl.current = "";
  }, [storedUrl, resumeAtSeconds]);

  const requestPlayUrl = useCallback(
    () => resolveProtectedMediaUrl(storedUrl.trim(), { courseSlug, scope: "learner", stream: true }),
    [storedUrl, courseSlug],
  );

  // Tokens are only checked when a request opens; swapping `src` early would discard the buffer,
  // so a fresh URL is fetched only after a request fails (expired token on seek, network drop).
  useEffect(() => {
    let cancelled = false;
    recoveriesRef.current = 0;
    pendingSeekRef.current = null;
    if (!storedUrl.trim()) return;
    requestPlayUrl()
      .then((url) => {
        if (cancelled) return;
        if (!url) onErrorRef.current?.("This video must be uploaded to protected course storage.");
        setMedia({ key: mediaKey, url: url || "" });
      })
      .catch(() => {
        if (cancelled) return;
        onErrorRef.current?.("Could not authorize video playback.");
        setMedia({ key: mediaKey, url: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [storedUrl, mediaKey, requestPlayUrl]);

  const recoverPlayback = async () => {
    const video = videoRef.current;
    if (!video || recoveringRef.current || recoveriesRef.current >= MAX_RECOVERIES) {
      if (!recoveringRef.current) onErrorRef.current?.("Video could not load. Please refresh and try again.");
      return;
    }
    recoveringRef.current = true;
    recoveriesRef.current += 1;
    pendingSeekRef.current = { at: video.currentTime, play: !video.ended };
    try {
      const url = await requestPlayUrl();
      if (!url) throw new Error("no url");
      setMedia({ key: mediaKey, url });
    } catch {
      pendingSeekRef.current = null;
      onErrorRef.current?.("Video could not load. Please refresh and try again.");
    } finally {
      recoveringRef.current = false;
    }
  };

  const applyPendingSeek = () => {
    const video = videoRef.current;
    const pending = pendingSeekRef.current;
    if (!video || !pending) return;
    pendingSeekRef.current = null;
    try {
      video.currentTime = pending.at;
    } catch {
      /* ignore */
    }
    if (pending.play) void video.play().catch(() => {});
  };

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
    if (!playUrl) return;

    const blank = () => {
      try {
        videoRef.current?.pause();
        bunnyApiRef.current?.pause();
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

  const maybeOfferResume = (duration: number, pause: () => void) => {
    if (!playUrl) return;
    if (resumeOfferedForUrl.current === storedUrl.trim()) return;

    const at = Math.max(0, resumeAtSeconds);
    const safeDuration = Number.isFinite(duration) ? duration : 0;
    if (at < RESUME_MIN_SECONDS) return;
    if (safeDuration > 0 && at >= safeDuration - RESUME_END_MARGIN_SECONDS) return;

    resumeOfferedForUrl.current = storedUrl.trim();
    pause();
    setResumePrompt({ at });
  };

  const seekAndPlay = (at: number) => {
    if (isBunny) {
      bunnyApiRef.current?.seekAndPlay(at);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = at;
    } catch {
      /* ignore */
    }
    void video.play().catch(() => {});
  };

  const chooseContinue = () => {
    const at = resumePrompt?.at ?? resumeAtSeconds;
    setResumePrompt(null);
    seekAndPlay(at);
    onResumeChoice?.("continue", at);
  };

  const chooseRestart = () => {
    setResumePrompt(null);
    seekAndPlay(0);
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
      {playUrl && isBunny ? (
        <BunnyLessonEmbed
          key={playUrl}
          src={playUrl}
          className={className}
          onReady={(api, duration) => {
            bunnyApiRef.current = api;
            maybeOfferResume(duration, api.pause);
          }}
          onTimeUpdate={(sample) => onTimeUpdate?.(sample)}
          onEnded={() => onEnded?.()}
          onError={(message) => onErrorRef.current?.(message)}
        />
      ) : playUrl ? (
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
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            if (pendingSeekRef.current) applyPendingSeek();
            else maybeOfferResume(video.duration, () => video.pause());
          }}
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget)}
          onEnded={() => onEnded?.()}
          onError={() => void recoverPlayback()}
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
