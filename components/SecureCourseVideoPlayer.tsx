"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

const REFRESH_MS = 2 * 60 * 1000;

type Props = {
  storedUrl: string;
  courseSlug: string;
  className?: string;
  onTimeUpdate?: (video: HTMLVideoElement) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
};

function tokenFromPlayUrl(url: string): string | null {
  try {
    return new URL(url, window.location.origin).searchParams.get("t");
  } catch {
    return null;
  }
}

/** Hardened learner video — short-lived signed URLs, no download UI, token refresh. */
export function SecureCourseVideoPlayer({
  storedUrl,
  courseSlug,
  className = "",
  onTimeUpdate,
  onEnded,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playUrlRef = useRef("");
  const onErrorRef = useRef(onError);
  const [playUrl, setPlayUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

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
      if (key === "s" || "u" || key === "p") {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", blockSaveKeys);
    return () => window.removeEventListener("keydown", blockSaveKeys);
  }, []);

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
          controls
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          playsInline
          preload="metadata"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
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
    </div>
  );
}
