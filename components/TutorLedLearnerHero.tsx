"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  TUTOR_LED_CERTIFICATE_SAMPLE_SRC,
  TUTOR_LED_TRUST_BADGE_SRC,
} from "@/lib/tutor-led-marketing-assets";
import {
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Download,
  Globe,
  Lock,
  PlayCircle,
  User,
  Video,
} from "lucide-react";

type JourneyStep = {
  day: number;
  title: string;
  status: "completed" | "in-progress" | "upcoming";
};

type Props = {
  program: TutorLedProgramStored;
  nextSessionTitle: string;
  zoomJoinUrl: string | null;
  progressPercent: number;
  journeySteps: JourneyStep[];
  completedCount: number;
  inProgressCount: number;
  upcomingCount: number;
  firstRecordingUrl?: string;
};

function batchDuration(program: TutorLedProgramStored): string {
  const row = program.batchDetails.find((d) => d.label === "Duration");
  return row?.value?.trim() || "4 Days";
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

const goldOutlineBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFB800]/55 bg-transparent px-4 py-2.5 text-sm font-semibold text-[#FFB800] transition hover:bg-[#FFB800]/10";

export function TutorLedLearnerHero({
  program,
  nextSessionTitle,
  zoomJoinUrl,
  progressPercent,
  journeySteps,
  completedCount,
  inProgressCount,
  upcomingCount,
  firstRecordingUrl,
}: Props) {
  const batchLabel = program.batchLabel?.trim() || program.nextBatchDate;
  const duration = batchDuration(program);
  const heroGraphic = program.learnerHeroSrc?.trim() || TUTOR_LED_TRUST_BADGE_SRC;

  const joinButton = zoomJoinUrl ? (
    <a
      href={zoomJoinUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(255,184,0,0.35)] transition hover:bg-[#e5a500]"
    >
      <Video className="h-4 w-4" aria-hidden />
      Join Zoom Session
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-bold text-zinc-500"
    >
      <Video className="h-4 w-4" aria-hidden />
      Join Zoom Session
    </button>
  );

  const donutStyle = useMemo(
    () => ({
      background: `conic-gradient(#22c55e 0% ${progressPercent}%, #27272a ${progressPercent}% 100%)`,
    }),
    [progressPercent],
  );

  return (
    <div className="space-y-4">
      {/* Top row — main hero + upcoming session */}
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* Main course hero card */}
        <article className="relative overflow-hidden rounded-2xl border border-[#FFB800]/25 bg-gradient-to-br from-zinc-950 via-[#141008] to-black p-5 shadow-[0_0_40px_rgba(255,184,0,0.08)] md:p-6">
          <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[#FFB800]/10 blur-3xl" aria-hidden />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_140px] lg:items-start">
            <div className="min-w-0">
              <span className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Enrolled
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white md:text-[1.65rem] lg:text-3xl">
                {program.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{program.subtitle?.trim() || program.badge}</p>

              <div className="mt-5 grid gap-4 border-y border-white/10 py-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetaCell label="Batch" value={batchLabel} />
                <MetaCell label="Trainer" value={program.trainer.name} />
                <MetaCell label="Duration" value={duration} />
                <MetaCell label="Language" value={program.language?.trim() || "English"} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-zinc-300">Your Progress</span>
                  <span className="font-bold text-[#FFB800]">{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFB800] to-[#f59e0b] shadow-[0_0_12px_rgba(255,184,0,0.45)] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  />
                </div>
              </div>

              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                <Calendar className="h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                <span>
                  Next Live Session:{" "}
                  <span className="font-semibold text-white">
                    {program.nextBatchDate}
                    {program.schedule ? ` · ${program.schedule}` : ""}
                  </span>
                </span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {joinButton}
                {firstRecordingUrl ? (
                  <a href={firstRecordingUrl} target="_blank" rel="noopener noreferrer" className={goldOutlineBtnClass}>
                    <PlayCircle className="h-4 w-4" aria-hidden />
                    Watch Recording
                  </a>
                ) : (
                  <Link href="#session-recordings" className={goldOutlineBtnClass}>
                    <PlayCircle className="h-4 w-4" aria-hidden />
                    Watch Recording
                  </Link>
                )}
                <Link href="#learning-materials" className={goldOutlineBtnClass}>
                  <Download className="h-4 w-4" aria-hidden />
                  Download Notes
                </Link>
              </div>
            </div>

            <div className="relative mx-auto flex h-[140px] w-[140px] shrink-0 items-center justify-center lg:mx-0 lg:mt-6">
              <div
                className="absolute inset-0 rounded-full bg-[#FFB800]/20 blur-2xl"
                aria-hidden
              />
              <div className="relative h-full w-full">
                <Image
                  src={heroGraphic}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_0_28px_rgba(255,184,0,0.45)]"
                  unoptimized
                  sizes="140px"
                />
              </div>
              <Image
                src={TUTOR_LED_CERTIFICATE_SAMPLE_SRC}
                alt=""
                width={48}
                height={48}
                className="pointer-events-none absolute -bottom-1 -right-1 hidden rounded-lg border border-[#FFB800]/30 opacity-40 lg:block"
                unoptimized
              />
            </div>
          </div>
        </article>

        {/* Upcoming live session card */}
        <article className="flex flex-col rounded-2xl border border-[#FFB800]/30 bg-gradient-to-b from-[#1a1408] to-zinc-950 p-5 shadow-[0_0_32px_rgba(255,184,0,0.06)]">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Upcoming Live Session</h2>
            <span className="shrink-0 rounded-md bg-[#FFB800]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FFB800]">
              Next
            </span>
          </div>
          <p className="mt-3 text-base font-semibold leading-snug text-white">{nextSessionTitle}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <span>{program.nextBatchDate}</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <span>{program.schedule}</span>
            </li>
            <li className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <span>{program.trainer.name}</span>
            </li>
          </ul>
          <div className="mt-auto space-y-2 pt-6">
            {zoomJoinUrl ? (
              <a
                href={zoomJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(255,184,0,0.35)] transition hover:bg-[#e5a500]"
              >
                <Video className="h-4 w-4" aria-hidden />
                Join Zoom Session
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-bold text-zinc-500"
              >
                <Video className="h-4 w-4" aria-hidden />
                Join Zoom Session
              </button>
            )}
            <Link href="/my-learning/calendar" className={`${goldOutlineBtnClass} w-full`}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Add to Calendar
            </Link>
          </div>
        </article>
      </div>

      {/* Bottom row — learning journey + progress donut */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
          <h2 className="text-lg font-bold text-white">Learning Journey</h2>
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="flex min-w-[520px] items-start justify-between gap-0 px-2">
              {journeySteps.map((step, i) => {
                const isLast = i === journeySteps.length - 1;
                const lineClass =
                  step.status === "completed"
                    ? "bg-emerald-500"
                    : step.status === "in-progress"
                      ? "bg-gradient-to-r from-emerald-500 to-[#FFB800]"
                      : "bg-zinc-700";

                return (
                  <div key={step.day} className="relative flex flex-1 flex-col items-center">
                    {!isLast ? (
                      <span
                        className={`absolute left-[calc(50%+18px)] top-4 h-0.5 w-[calc(100%-36px)] ${lineClass}`}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        step.status === "completed"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                          : step.status === "in-progress"
                            ? "border-[#FFB800] bg-[#FFB800]/20 text-[#FFB800]"
                            : "border-zinc-600 bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                      ) : step.status === "upcoming" ? (
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        step.day
                      )}
                    </span>
                    <p className="mt-2 text-[10px] font-semibold text-zinc-500">Day {step.day}</p>
                    <p className="mt-0.5 max-w-[88px] text-center text-[11px] font-medium leading-tight text-zinc-300">
                      {step.title}
                    </p>
                    <p
                      className={`mt-1 text-[10px] font-semibold ${
                        step.status === "completed"
                          ? "text-emerald-400"
                          : step.status === "in-progress"
                            ? "text-[#FFB800]"
                            : "text-zinc-500"
                      }`}
                    >
                      {step.status === "completed"
                        ? "Completed"
                        : step.status === "in-progress"
                          ? "In Progress"
                          : "Upcoming"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
          <h2 className="text-lg font-bold text-white">Course Progress</h2>
          <div className="mt-4 flex flex-col items-center sm:flex-row sm:items-center sm:gap-6">
            <div className="relative grid h-28 w-28 place-items-center">
              <div className="absolute inset-0 rounded-full opacity-90" style={donutStyle} aria-hidden />
              <div className="relative flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full bg-zinc-950 text-center">
                <span className="text-xl font-bold text-[#FFB800]">{progressPercent}%</span>
                <span className="text-[9px] text-zinc-500">Completed</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm sm:mt-0">
              <li className="flex items-center gap-2 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                Completed ({completedCount} Sessions)
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFB800]" aria-hidden />
                In Progress ({inProgressCount} Sessions)
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" aria-hidden />
                Upcoming ({upcomingCount} Sessions)
              </li>
            </ul>
          </div>
          <Link
            href="#live-curriculum"
            className={`${goldOutlineBtnClass} mt-5 w-full`}
          >
            <Globe className="h-4 w-4" aria-hidden />
            View Progress Report
          </Link>
        </article>
      </div>
    </div>
  );
}

export function buildJourneySteps(
  curriculum: TutorLedProgramStored["curriculum"],
  completedSessions: number,
  maxDays = 6,
): JourneyStep[] {
  const steps = curriculum.slice(0, maxDays).map((w, i) => {
    const title =
      w.topic.split(/[—–-]/)[0]?.trim() ||
      w.label?.replace(/^Module\s*/i, "").trim() ||
      w.topic;
    let status: JourneyStep["status"] = "upcoming";
    if (i < completedSessions) status = "completed";
    else if (i === completedSessions) status = "in-progress";
    return { day: i + 1, title, status };
  });
  return steps.length > 0
    ? steps
    : [
        { day: 1, title: "Introduction", status: "in-progress" as const },
        { day: 2, title: "Core modules", status: "upcoming" as const },
      ];
}

export function computeProgramProgress(totalSessions: number, completedSessions: number) {
  const total = Math.max(1, totalSessions);
  const completed = Math.min(completedSessions, total);
  const inProgressCount = completed < total ? 1 : 0;
  const upcomingCount = Math.max(0, total - completed - inProgressCount);
  const progressPercent = Math.round(((completed + (inProgressCount ? 0.35 : 0)) / total) * 100);
  return { completedCount: completed, inProgressCount, upcomingCount, progressPercent };
}
