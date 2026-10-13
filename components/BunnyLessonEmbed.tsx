"use client";

import { useEffect, useRef } from "react";

const PLAYER_JS_SRC = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";

export function isBunnyEmbedUrl(url: string): boolean {
  return url.startsWith("https://iframe.mediadelivery.net/embed/");
}

export type LessonPlaybackSample = { currentTime: number; paused: boolean; ended: boolean };
export type LessonPlayerApi = { pause: () => void; seekAndPlay: (atSeconds: number) => void };

type PlayerJs = {
  on: (event: string, cb: (data?: { seconds?: number; duration?: number }) => void) => void;
  play: () => void;
  pause: () => void;
  setCurrentTime: (seconds: number) => void;
  getDuration: (cb: (duration: number) => void) => void;
};

declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs };
  }
}

let playerJsPromise: Promise<void> | null = null;

function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  playerJsPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLAYER_JS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      playerJsPromise = null;
      reject(new Error("player.js failed to load"));
    };
    document.head.appendChild(script);
  });
  return playerJsPromise;
}

type Props = {
  src: string;
  className?: string;
  onReady?: (api: LessonPlayerApi, durationSeconds: number) => void;
  onTimeUpdate?: (sample: LessonPlaybackSample) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
};

/** Bunny Stream adaptive (HLS) player in an iframe, driven through player.js events. */
export function BunnyLessonEmbed({ src, className = "", onReady, onTimeUpdate, onEnded, onError }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onReady, onTimeUpdate, onEnded, onError });

  useEffect(() => {
    callbacks.current = { onReady, onTimeUpdate, onEnded, onError };
  }, [onReady, onTimeUpdate, onEnded, onError]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;
    let paused = true;

    loadPlayerJs()
      .then(() => {
        if (cancelled || !window.playerjs) return;
        const player = new window.playerjs.Player(iframe);
        player.on("ready", () => {
          if (cancelled) return;
          const api: LessonPlayerApi = {
            pause: () => player.pause(),
            seekAndPlay: (at) => {
              player.setCurrentTime(at);
              player.play();
            },
          };
          player.getDuration((duration) => {
            if (!cancelled) callbacks.current.onReady?.(api, Number(duration) || 0);
          });
          player.on("play", () => {
            paused = false;
          });
          player.on("pause", () => {
            paused = true;
          });
          player.on("timeupdate", (data) => {
            const t = Number(data?.seconds);
            if (!cancelled && Number.isFinite(t)) {
              callbacks.current.onTimeUpdate?.({ currentTime: t, paused, ended: false });
            }
          });
          player.on("ended", () => {
            paused = true;
            if (!cancelled) callbacks.current.onEnded?.();
          });
        });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError?.("Video player could not load. Please refresh and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Lesson video"
      loading="eager"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; fullscreen"
      allowFullScreen
      referrerPolicy="origin"
      className={`border-0 ${className}`}
    />
  );
}
