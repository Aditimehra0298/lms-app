"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { resolveCurriculumDays } from "@/lib/tutor-led-curriculum-days";

type ViewMode = "week" | "day";

type WeekProgress = { done: number; total: number; label: string | null };

type Props = {
  program: Pick<TutorLedProgramStored, "curriculum" | "curriculumMode">;
  variant?: "marketing" | "learner";
  weekProgress?: WeekProgress[];
  liveJoinAnchor?: string;
  /** Parent provides section title — hide duplicate heading */
  embedded?: boolean;
};

const kindBadge: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "border-sky-400/40 bg-sky-500/15 text-sky-200" },
  recording: { label: "Recording", className: "border-[#FFB800]/40 bg-[#FFB800]/10 text-[#FFB800]" },
  lab: { label: "Lab", className: "border-violet-400/40 bg-violet-500/15 text-violet-200" },
};

export function TutorLedCurriculumExplorer({
  program,
  variant = "marketing",
  weekProgress,
  liveJoinAnchor = "#zoom-live",
  embedded = false,
}: Props) {
  const weeks = program.curriculum;
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>(() => ({ 0: true }));
  const [expandAll, setExpandAll] = useState(false);

  const weeksWithDays = useMemo(
    () =>
      weeks.map((week, weekIndex) => ({
        week,
        weekIndex,
        days: resolveCurriculumDays(program, week, weekIndex),
      })),
    [program, weeks],
  );

  const totalDays = useMemo(
    () => weeksWithDays.reduce((n, w) => n + w.days.length, 0),
    [weeksWithDays],
  );

  const toggleWeek = (idx: number) => {
    setOpenWeeks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleExpandAll = () => {
    const next = !expandAll;
    setExpandAll(next);
    const map: Record<number, boolean> = {};
    weeks.forEach((_, i) => {
      map[i] = next;
    });
    setOpenWeeks(map);
  };

  const tabClass = (mode: ViewMode) =>
    viewMode === mode
      ? "border-[#FFB800]/60 bg-[#FFB800]/15 text-[#FFB800]"
      : "border-white/10 bg-black/30 text-zinc-400 hover:bg-white/5";

  return (
    <div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${embedded ? "pb-3" : "border-b border-white/10 pb-4"}`}
      >
        <div>
          {!embedded ? (
            <>
              <h2 className="text-lg font-bold text-white md:text-xl">
                {variant === "learner" ? "Course Curriculum" : "Live Training Schedule"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {weeks.length} weeks · {totalDays} live sessions (days)
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              {weeks.length} weeks · {totalDays} sessions
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${tabClass("week")}`}
            >
              By week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${tabClass("day")}`}
            >
              By day
            </button>
          </div>
          {viewMode === "day" ? (
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-200"
            >
              {expandAll ? "Collapse all" : "Expand all"}
            </button>
          ) : null}
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="mt-4 flex gap-3">
          <div className="hidden w-40 shrink-0 space-y-2 md:block">
            {weeksWithDays.map(({ week, weekIndex, days }) => (
              <div
                key={week.week}
                className={`rounded-xl border px-3 py-2.5 transition ${
                  weekIndex === 0
                    ? "border-[#FFB800]/60 bg-[#FFB800]/12 shadow-[0_0_20px_rgba(255,184,0,0.12)]"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFB800]">Week {week.week}</p>
                <p className="text-[11px] text-zinc-400">{week.label}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{days.length} days</p>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
            <table className="w-full min-w-[520px] text-left text-xs md:min-w-0">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Key learning</th>
                  <th className="px-4 py-3 text-right">Days</th>
                  <th className="px-4 py-3 text-right">Session</th>
                </tr>
              </thead>
              <tbody>
                {weeksWithDays.map(({ week, days }) => (
                  <tr key={week.week} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 align-top">
                      <span className="font-bold text-[#FFB800]">Week {week.week}</span>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{week.label}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top text-zinc-200">{week.topic}</td>
                    <td className="px-4 py-3.5 align-top text-zinc-500">{week.keyLearning}</td>
                    <td className="px-4 py-3.5 align-top text-right text-zinc-400">{days.length} days</td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <span className="inline-block rounded-full border border-[#FFB800]/25 bg-[#FFB800]/10 px-2.5 py-1 text-[10px] font-semibold text-[#FFB800]">
                        {week.sessionType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-white/5 px-4 py-3 text-[10px] text-zinc-600">
              Switch to <strong className="text-zinc-400">By day</strong> to see each live session (Day 1–5 per week).
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {weeksWithDays.map(({ week, weekIndex, days }) => {
            const open = !!openWeeks[weekIndex];
            const progress = weekProgress?.[weekIndex];

            return (
              <li key={week.week} className="py-1">
                <button
                  type="button"
                  onClick={() => toggleWeek(weekIndex)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[0.03]"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 font-semibold text-zinc-100">
                    Week {week.week}: {week.topic}
                  </span>
                  <span className="shrink-0 text-[10px] text-zinc-500">{days.length} days</span>
                  {progress?.label === "Completed" ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                      Completed
                    </span>
                  ) : progress ? (
                    <span className="shrink-0 text-xs text-zinc-500">
                      {progress.done}/{progress.total} done
                    </span>
                  ) : null}
                </button>

                {open ? (
                  <ul className="mb-3 ml-7 space-y-2 border-l border-white/10 pl-4">
                    {days.map((day) => {
                      const badge = kindBadge[day.kind] ?? kindBadge.recording;
                      return (
                        <li
                          key={day.id}
                          className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-amber-200/90">{day.label}</p>
                            <p className="mt-0.5 text-sm text-zinc-300">{day.title}</p>
                            <p className="mt-1 text-xs text-zinc-500">{day.duration}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {variant === "learner" && day.kind === "recording" && day.recordingUrl ? (
                              <a
                                href={day.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-[#FFB800]/50 bg-[#FFB800]/10 px-3 py-1.5 text-xs font-bold text-[#FFB800] hover:bg-[#FFB800]/20"
                              >
                                Watch
                              </a>
                            ) : null}
                            {variant === "learner" && day.kind === "live" ? (
                              <a
                                href={liveJoinAnchor}
                                className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
                              >
                                Join live
                              </a>
                            ) : null}
                            {variant === "marketing" && day.kind === "live" ? (
                              <span className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-200">
                                Live on Zoom
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
