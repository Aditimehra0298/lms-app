"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Sparkles } from "lucide-react";

type Phase = "enter" | "expand" | "celebrate" | "exit" | "done";

type Props = {
  courseTitle: string;
  scorePercent?: number | null;
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
  return `sft_completion_celebration_v2_${courseSlug.trim()}`;
}

export function hasSeenCompletionCelebration(courseSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(completionCelebrationStorageKey(courseSlug)) === "1";
}

export function markCompletionCelebrationSeen(courseSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(completionCelebrationStorageKey(courseSlug), "1");
}

export function CourseCompletionCelebration({ courseTitle, scorePercent, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhase("celebrate");
      const t = window.setTimeout(() => {
        setPhase("done");
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 2500);
      return () => window.clearTimeout(t);
    }

    const expandTimer = window.setTimeout(() => setPhase("expand"), 80);
    const celebrateTimer = window.setTimeout(() => setPhase("celebrate"), 1080);
    const exitTimer = window.setTimeout(() => setPhase("exit"), 4080);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 4680);

    return () => {
      window.clearTimeout(expandTimer);
      window.clearTimeout(celebrateTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

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

  if (phase === "done" || !mounted) return null;

  const expanded = phase === "expand" || phase === "celebrate" || phase === "exit";
  const showMessage = phase === "celebrate" || phase === "exit";
  const exiting = phase === "exit";

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      aria-live="polite"
      role="dialog"
      aria-label="Course completed"
    >
      <div
        className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "bg-black/75 backdrop-blur-xl" : "bg-black/20 backdrop-blur-[2px]"
        } ${exiting ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />

      <div
        className={`relative z-10 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded
            ? "fixed inset-0 h-full w-full rounded-none"
            : "h-28 w-28 rounded-3xl"
        } ${exiting ? "scale-[1.02] opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
        style={{
          background: expanded
            ? "radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.22) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.18) 0%, transparent 45%), linear-gradient(165deg, #0f1419 0%, #1a1030 45%, #0a0a0a 100%)"
            : "linear-gradient(145deg, rgba(245,158,11,0.95) 0%, rgba(139,92,246,0.92) 100%)",
        }}
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {!showMessage ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40 transition-transform duration-500 ${
                phase === "enter" ? "scale-100" : "scale-110"
              }`}
            >
              <BadgeCheck className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            </div>
          </div>
        ) : (
          <div
            className={`relative flex h-full flex-col items-center justify-center px-6 text-center transition-all duration-700 ${
              phase === "celebrate" ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
            }`}
          >
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">
              <Sparkles size={14} aria-hidden />
              Course complete
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold text-white md:text-5xl">
              Congratulations!
            </h2>
            <p className="mt-3 max-w-xl text-base text-gray-300 md:text-lg">
              You completed all modules and passed every assessment for
            </p>
            <p className="mt-2 bg-gradient-to-r from-amber-200 via-white to-violet-200 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {courseTitle}
            </p>
            {scorePercent != null ? (
              <p className="mt-5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-200">
                Final score: {Math.round(scorePercent)}%
              </p>
            ) : null}
            <p className="mt-8 text-sm text-gray-500">Your certificate is ready</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
