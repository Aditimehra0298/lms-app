"use client";

import { useId } from "react";

type Props = {
  total: number;
  currentIndex: number;
  answeredIndices: number[];
  reviewedIndices: number[];
  onSelectQuestion: (index: number) => void;
};

const RING_SIZE = 88;
const RING_STROKE = 7;

function CircularProgressRing({
  percent,
  answered,
  total,
  gradientId,
}: {
  percent: number;
  answered: number;
  total: number;
  gradientId: string;
}) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-[88px] w-[88px] items-center justify-center">
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden>
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold tabular-nums text-white">{percent}%</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">done</span>
      </div>
      <p className="sr-only">
        {answered} of {total} questions answered, {percent}% complete
      </p>
    </div>
  );
}

function StatCircle({
  value,
  label,
  variant,
}: {
  value: number;
  label: string;
  variant: "done" | "left" | "review";
}) {
  const styles = {
    done: "border-emerald-400/45 bg-emerald-500/12 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
    left: "border-white/15 bg-black/35 text-gray-200",
    review: "border-rose-400/45 bg-rose-500/12 text-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.12)]",
  }[variant];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums ${styles}`}
      >
        {value}
      </div>
      <span className="text-[10px] font-medium text-gray-500">{label}</span>
    </div>
  );
}

function questionCircleClass(isCurrent: boolean, isAnswered: boolean, isMarked: boolean): string {
  const base =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-all duration-200 ";
  if (isCurrent) {
    return (
      base +
      "border-violet-300 bg-violet-600/30 text-white shadow-[0_0_0_3px_rgba(139,92,246,0.35),0_0_16px_rgba(139,92,246,0.25)] scale-110 z-[1]"
    );
  }
  if (isMarked) {
    return (
      base +
      "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 hover:scale-105"
    );
  }
  if (isAnswered) {
    return (
      base +
      "border-emerald-400/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 hover:scale-105"
    );
  }
  return (
    base +
    "border-white/20 bg-black/40 text-gray-400 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-violet-100 hover:scale-105"
  );
}

export function ExamProgressPanel({
  total,
  currentIndex,
  answeredIndices,
  reviewedIndices,
  onSelectQuestion,
}: Props) {
  const answered = answeredIndices.length;
  const unanswered = Math.max(0, total - answered);
  const marked = reviewedIndices.length;
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  const gradientId = useId().replace(/:/g, "");

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c1324] p-4">
      <p className="text-center text-sm font-semibold text-violet-100">Your progress</p>

      <div className="mt-3 flex flex-col items-center">
        <CircularProgressRing percent={percent} answered={answered} total={total} gradientId={gradientId} />
        <p className="mt-2 text-center text-sm text-gray-300">
          <span className="font-bold text-white">{answered}</span>
          <span className="text-gray-500"> / </span>
          <span className="font-semibold text-gray-400">{total}</span>
          <span className="text-gray-500"> answered</span>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <StatCircle value={answered} label="Done" variant="done" />
        <StatCircle value={unanswered} label="Left" variant="left" />
        <StatCircle value={marked} label="Review" variant="review" />
      </div>

      {total > 0 ? (
        <>
          <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Questions
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2.5 px-1">
            {Array.from({ length: total }, (_, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = answeredIndices.includes(idx);
              const isMarked = reviewedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  title={`Question ${idx + 1}${isAnswered ? " — answered" : ""}${isMarked ? " — marked for review" : ""}`}
                  aria-label={`Question ${idx + 1}${isCurrent ? ", current" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={questionCircleClass(isCurrent, isAnswered, isMarked)}
                >
                  {idx + 1}
                  {isMarked && !isCurrent ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#0c1324] bg-rose-400"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-emerald-400/50 bg-emerald-500/20" />
              Answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-white/20 bg-black/40" />
              Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-rose-400/50 bg-rose-500/20" />
              Marked
            </span>
          </div>
        </>
      ) : null}
    </article>
  );
}
