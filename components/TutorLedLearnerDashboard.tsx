"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Megaphone,
  Play,
  Shield,
  Video,
} from "lucide-react";

type Props = { program: TutorLedProgramStored };

function useCountdown(initial: { hours: number; mins: number; secs: number }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    setTime(initial);
  }, [initial.hours, initial.mins, initial.secs]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime((p) => {
        let { hours, mins, secs } = p;
        secs--;
        if (secs < 0) {
          secs = 59;
          mins--;
        }
        if (mins < 0) {
          mins = 59;
          hours--;
        }
        if (hours < 0) return { hours: 0, mins: 0, secs: 0 };
        return { hours, mins, secs };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [initial.hours, initial.mins, initial.secs]);

  return time;
}

const DEMO_RECORDINGS = [
  { title: "Session 1", duration: "2:18:20", thumb: "/h1.png" },
  { title: "Session 2", duration: "2:05:10", thumb: "/h2.png" },
  { title: "Session 3", duration: "1:58:45", thumb: "/h3.png" },
  { title: "Session 4", duration: "2:12:30", thumb: "/h1.png" },
];

const DEMO_RESOURCES = [
  { name: "Course Guide.pdf", size: "2.4 MB" },
  { name: "Lab Manual.pdf", size: "3.1 MB" },
  { name: "Cheat Sheet.pdf", size: "1.8 MB" },
  { name: "Tools List.pdf", size: "1.2 MB" },
];

const DEMO_ANNOUNCEMENTS = [
  { text: "Live session on 28 May at 7 PM IST — join 10 minutes early.", ago: "2h ago" },
  { text: "Please complete pre-reading for Week 2 before Saturday.", ago: "1d ago" },
  { text: "Lab access updated for Week 1 participants.", ago: "3d ago" },
];

function weekDaysFromCurriculum(week: TutorLedProgramStored["curriculum"][0], weekIndex: number) {
  const base = week.topic;
  return [1, 2, 3, 4, 5].map((day, i) => ({
    id: `w${weekIndex}-d${day}`,
    label: `Day ${day}`,
    title:
      i < 4
        ? `${week.label}: ${base} — Part ${day}`
        : `${week.label}: ${base} — Lab & recap`,
    duration: i < 4 ? `${2 + (i % 2)}h ${10 + i * 5}m` : "1h 45m",
    kind: i === 4 ? ("lab" as const) : ("recording" as const),
    done: weekIndex === 0 && i < 4,
  }));
}

export default function TutorLedLearnerDashboard({ program }: Props) {
  const cd = useCountdown({
    hours: program.countdown.hours,
    mins: program.countdown.mins,
    secs: program.countdown.secs,
  });

  const weeks = program.curriculum;
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>(() => ({ 0: true }));
  const [expandAll, setExpandAll] = useState(false);

  const weekProgress = useMemo(
    () =>
      weeks.map((_, i) => {
        if (i === 0) return { done: 5, total: 5, label: "Completed" as const };
        if (i === 1) return { done: 3, total: 5, label: null };
        return { done: 0, total: 5, label: null };
      }),
    [weeks],
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

  const nextSessionTitle =
    weeks[1]?.topic ?? "Advanced Threat Detection Techniques";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <div className="mb-6">
          <p className="text-xs text-zinc-500">
            <Link href="/my-learning?tab=live" className="hover:text-amber-300">
              Tutor Led
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-400">{program.title}</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{program.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tutor-Led Training <span className="text-zinc-600">·</span> Live on Zoom
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            {/* Next live session */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB800]">
                    Next Live Session
                  </p>
                  <h2 className="mt-2 text-xl font-bold md:text-2xl">{nextSessionTitle}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-zinc-500" aria-hidden />
                      {program.nextBatchDate}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-zinc-500" aria-hidden />
                      {program.schedule}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-300">
                      {program.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{program.trainer.name}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Starts in
                    </p>
                    <div className="mt-1 flex gap-2 font-mono text-2xl font-bold tabular-nums text-[#FFB800]">
                      <span>{String(cd.hours).padStart(2, "0")}</span>
                      <span className="text-zinc-600">:</span>
                      <span>{String(cd.mins).padStart(2, "0")}</span>
                      <span className="text-zinc-600">:</span>
                      <span>{String(cd.secs).padStart(2, "0")}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-500">Hours · Mins · Secs</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 md:items-end">
                  <div className="hidden h-24 w-24 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 md:flex">
                    <Shield className="h-12 w-12 text-[#FFB800]" strokeWidth={1.25} aria-hidden />
                  </div>
                  <Link
                    href="/my-learning/calendar"
                    className="inline-flex w-full min-w-[200px] items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-auto"
                  >
                    <Video className="h-4 w-4" aria-hidden />
                    Join Live Session
                  </Link>
                  <p className="text-xs text-zinc-500">Live on Zoom</p>
                </div>
              </div>
            </section>

            {/* Curriculum */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-lg font-bold">Course Curriculum</h2>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    {expandAll ? "Collapse All" : "Expand All"}
                  </button>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-500">Day by Day</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                </div>
              </div>

              <ul className="mt-2 divide-y divide-white/5">
                {weeks.map((week, weekIdx) => {
                  const open = !!openWeeks[weekIdx];
                  const progress = weekProgress[weekIdx];
                  const days = weekDaysFromCurriculum(week, weekIdx);
                  const weekTitle =
                    weekIdx === 0
                      ? "Foundations of Cyber Security"
                      : week.topic;

                  return (
                    <li key={week.week} className="py-1">
                      <button
                        type="button"
                        onClick={() => toggleWeek(weekIdx)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[0.03]"
                      >
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 font-semibold text-zinc-100">
                          Week {week.week}: {weekTitle}
                        </span>
                        {progress.label === "Completed" ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                            Completed
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-zinc-500">
                            {progress.done}/{progress.total} Completed
                          </span>
                        )}
                      </button>

                      {open ? (
                        <ul className="mb-3 ml-7 space-y-2 border-l border-white/10 pl-4">
                          {days.map((day) => (
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
                                {day.kind === "recording" ? (
                                  <button
                                    type="button"
                                    className="rounded-lg border border-[#FFB800]/50 bg-[#FFB800]/10 px-3 py-1.5 text-xs font-bold text-[#FFB800] hover:bg-[#FFB800]/20"
                                  >
                                    Watch Recording
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/25"
                                  >
                                    View Lab
                                  </button>
                                )}
                                {day.done ? (
                                  <span
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
                                    aria-label="Completed"
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Recordings */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Session Recordings</h2>
                <button type="button" className="text-xs font-semibold text-amber-300 hover:text-amber-200">
                  View All Recordings
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {DEMO_RECORDINGS.map((rec) => (
                  <article
                    key={rec.title}
                    className="w-[200px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
                  >
                    <div className="relative aspect-video bg-black">
                      <Image src={rec.thumb} alt="" fill className="object-cover opacity-80" unoptimized />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="h-10 w-10 text-white/90" fill="currentColor" aria-hidden />
                      </span>
                      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium">
                        {rec.duration}
                      </span>
                    </div>
                    <p className="p-2 text-xs font-medium text-zinc-300">{rec.title}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="text-sm font-bold text-zinc-200">Course Instructor</h3>
              <div className="mt-3 flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/40 bg-zinc-900 text-2xl font-bold text-amber-300">
                  {program.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                </div>
                <p className="mt-3 font-semibold text-white">{program.trainer.name}</p>
                <p className="text-xs text-zinc-400">{program.trainer.role}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{program.trainer.experience}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {program.trainer.certifications.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    >
                      {c.replace(/\s*Certified\s*/i, "").trim()}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border border-white/15 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                >
                  View Profile
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="text-sm font-bold text-zinc-200">Course Resources</h3>
              <ul className="mt-3 space-y-2">
                {DEMO_RESOURCES.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-zinc-300">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-500">{r.size}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                View All Resources
              </button>
            </article>

            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200">
                <Megaphone className="h-4 w-4 text-amber-400" aria-hidden />
                Recent Announcements
              </h3>
              <ul className="mt-3 space-y-3">
                {DEMO_ANNOUNCEMENTS.map((a) => (
                  <li key={a.text} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs leading-relaxed text-zinc-400">{a.text}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">{a.ago}</p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-bold text-amber-100">
                <HelpCircle className="h-4 w-4" aria-hidden />
                Need Help?
              </h3>
              <p className="mt-2 text-xs text-zinc-400">Ask your trainer or cohort in the community forum.</p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-[#FFB800] py-2.5 text-xs font-bold text-black hover:bg-[#e5a500]"
              >
                Raise a Doubt
              </button>
            </article>
          </aside>
        </div>
      </main>
    </div>
  );
}
