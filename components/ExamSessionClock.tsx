"use client";

import { useEffect, useState } from "react";
import { AlarmClock, CalendarDays } from "lucide-react";
import { formatDurationHms, formatLiveDateTime } from "@/lib/exam-time-format";

type Props = {
  timed: boolean;
  timeRemainingSec: number | null;
  startedAtMs: number;
  onEndExam: () => void;
};

export function ExamSessionClock({ timed, timeRemainingSec, startedAtMs, onEndExam }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { dateLine, timeLine } = formatLiveDateTime(new Date(nowMs));
  const showCountdown = timed && timeRemainingSec !== null;
  const elapsedSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const remainingDisplay = showCountdown ? formatDurationHms(timeRemainingSec) : null;
  const elapsedDisplay = formatDurationHms(elapsedSec);
  const lowTime = showCountdown && timeRemainingSec <= 300;

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Live date & time</p>
      <div className="mt-2 flex items-start gap-2.5">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] leading-snug text-zinc-400">{dateLine}</p>
          <p className="font-mono text-2xl font-bold tabular-nums tracking-wide text-white">{timeLine}</p>
        </div>
      </div>

      {showCountdown ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs text-gray-400">Time remaining</p>
          <p
            className={`mt-1 flex items-center gap-2 font-mono text-3xl font-bold tabular-nums ${
              lowTime ? "text-rose-300" : "text-amber-100"
            }`}
          >
            <AlarmClock
              className={`h-5 w-5 shrink-0 ${lowTime ? "animate-pulse text-rose-400" : "text-amber-300"}`}
              aria-hidden
            />
            <span>{remainingDisplay}</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Elapsed {elapsedDisplay} · Exam auto-submits when the timer reaches 00:00
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onEndExam}
        className={`w-full rounded-md border border-red-300/35 bg-red-500/10 py-2 text-sm text-red-200 transition hover:bg-red-500/20 ${showCountdown ? "mt-3" : "mt-4"}`}
      >
        End Exam
      </button>
    </article>
  );
}
