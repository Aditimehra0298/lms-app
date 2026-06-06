"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

type Phase = "enter" | "expand" | "celebrate" | "exit" | "done";

type Props = {
  courseTitle: string;
  scorePercent?: number | null;
  badgeImageUrl?: string;
  onComplete: () => void;
};

type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  spin: number;
};

const CONFETTI_COLORS = ["#f59e0b", "#fbbf24", "#8b5cf6", "#a78bfa", "#22c55e", "#f472b6", "#ffffff"];

function spawnConfetti(width: number, height: number, count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * -0.5 - 20,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 4 + 3,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? "#f59e0b",
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 12,
  }));
}

export function completionCelebrationStorageKey(courseSlug: string): string {
  return `sft_completion_celebration_v4_${courseSlug.trim()}`;
}

export function hasSeenCompletionCelebration(courseSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(completionCelebrationStorageKey(courseSlug)) === "1";
}

export function markCompletionCelebrationSeen(courseSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(completionCelebrationStorageKey(courseSlug), "1");
}

/** @deprecated Pending queue no longer required; kept for exam page compatibility. */
export function queueCompletionCelebration(courseSlug: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`sft_completion_celebration_pending_${courseSlug.trim()}`, "1");
}

export function clearPendingCompletionCelebration(courseSlug: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`sft_completion_celebration_pending_${courseSlug.trim()}`);
}

export function CourseCompletionCelebration({
  courseTitle,
  scorePercent,
  badgeImageUrl,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [badgeSrc, setBadgeSrc] = useState("");
  const [badgeFailed, setBadgeFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setBadgeFailed(false);
    const raw = badgeImageUrl?.trim() ?? "";
    if (!raw) {
      setBadgeSrc("");
      return;
    }
    const needsToken =
      raw.startsWith("/api/media/serve/") ||
      raw.startsWith("/uploads/admin/") ||
      raw.startsWith("/storage/private/");
    if (!needsToken) {
      setBadgeSrc(raw);
      return;
    }
    let cancelled = false;
    void resolveProtectedMediaUrl(raw, { scope: "catalog" }).then((resolved) => {
      if (!cancelled) setBadgeSrc(resolved || raw);
    });
    return () => {
      cancelled = true;
    };
  }, [badgeImageUrl]);

  useEffect(() => {
    finishedRef.current = false;
    setPhase("enter");

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setPhase("done");
      onCompleteRef.current();
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhase("celebrate");
      const t = window.setTimeout(finish, 2800);
      return () => window.clearTimeout(t);
    }

    const expandTimer = window.setTimeout(() => setPhase("expand"), 80);
    const celebrateTimer = window.setTimeout(() => setPhase("celebrate"), 1080);
    const exitTimer = window.setTimeout(() => setPhase("exit"), 4080);
    const doneTimer = window.setTimeout(finish, 4680);

    return () => {
      window.clearTimeout(expandTimer);
      window.clearTimeout(celebrateTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "celebrate" && phase !== "exit") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let pieces = spawnConfetti(canvas.width, canvas.height, 160);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.rotation += p.spin;

        if (p.y > canvas.height + 24) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 4 + 2;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = phase === "exit" ? 0.35 : 0.95;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  if (phase === "done") return null;

  const expanded = phase === "expand" || phase === "celebrate" || phase === "exit";
  const showMessage = phase === "celebrate" || phase === "exit";
  const exiting = phase === "exit";
  const showBadgeImage = Boolean(badgeSrc) && !badgeFailed;

  const badgeSizeClass = expanded
    ? showMessage
      ? "h-36 w-36 md:h-44 md:w-44"
      : "h-40 w-40 md:h-52 md:w-52"
    : "h-28 w-28 md:h-32 md:w-32";

  const badgeVisual = showBadgeImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badgeSrc}
      alt={`${courseTitle} course badge`}
      className={`${badgeSizeClass} object-contain drop-shadow-[0_12px_40px_rgba(245,158,11,0.45)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]`}
      onError={() => setBadgeFailed(true)}
    />
  ) : (
    <div
      className={`flex ${badgeSizeClass} items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-violet-600 shadow-[0_12px_40px_rgba(245,158,11,0.35)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      <BadgeCheck className="h-1/2 w-1/2 text-white" strokeWidth={2.5} aria-hidden />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060b17]"
      aria-live="polite"
      role="dialog"
      aria-label="Course completed"
    >
      <div
        className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "bg-black/75 backdrop-blur-xl" : "bg-black/40 backdrop-blur-sm"
        } ${exiting ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

      <div
        className={`relative z-10 flex flex-col items-center justify-center px-6 text-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "scale-100" : "scale-100"
        } ${exiting ? "scale-[0.98] opacity-0 blur-sm" : "opacity-100"}`}
      >
        <div
          className={`rounded-full transition-all duration-1000 ${
            expanded && showMessage
              ? "mb-6 ring-4 ring-amber-400/30 ring-offset-4 ring-offset-transparent"
              : expanded
                ? "ring-4 ring-amber-400/40 ring-offset-8 ring-offset-[#060b17]"
                : "ring-4 ring-amber-300/50 ring-offset-4 ring-offset-[#060b17]"
          }`}
        >
          {badgeVisual}
        </div>

        {showMessage ? (
          <div
            className={`max-w-2xl transition-all duration-700 ${
              phase === "celebrate" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">
              <Sparkles size={14} aria-hidden />
              Course complete
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">Congratulations!</h2>
            <p className="mt-3 text-base text-gray-300 md:text-lg">
              You completed all modules and passed every assessment for
            </p>
            <p className="mt-2 bg-gradient-to-r from-amber-200 via-white to-violet-200 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {courseTitle}
            </p>
            {scorePercent != null ? (
              <p className="mt-5 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-200">
                Final score: {Math.round(scorePercent)}%
              </p>
            ) : null}
            <p className="mt-8 text-sm text-gray-500">Opening your certificate…</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
