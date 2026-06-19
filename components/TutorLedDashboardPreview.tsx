"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  MonitorPlay,
  NotebookPen,
  Play,
  Presentation,
  Video,
} from "lucide-react";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";

const MOCK_RECORDINGS = [
  { title: "Day 1 — Introduction", duration: "2:14:00" },
  { title: "Day 2 — Network Security", duration: "1:58:00" },
  { title: "Day 3 — Practical Labs", duration: "2:05:00" },
];

const MOCK_RESOURCES = [
  { kind: "pad-notes" as const, label: "Pad notes", file: "Session notes · PDF" },
  { kind: "ppt" as const, label: "Presentation", file: "Module slides · PPT" },
  { kind: "webbook" as const, label: "Webbook", file: "Course reader · PDF" },
];

const RESOURCE_ICONS = {
  "pad-notes": NotebookPen,
  ppt: Presentation,
  webbook: BookOpen,
};

export type TutorLedDashboardPreviewProps = {
  programTitle: string;
  nextSessionTitle: string;
  batchStartDate: string;
  scheduleLabel: string;
  trainerName: string;
  countdown: { days: number; hours: number; mins: number; secs: number };
};

function usePreviewCountdown(initial: TutorLedDashboardPreviewProps["countdown"]) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    setTime(initial);
  }, [initial.days, initial.hours, initial.mins, initial.secs]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime((p) => {
        let { days, hours, mins, secs } = p;
        secs--;
        if (secs < 0) {
          secs = 59;
          mins--;
        }
        if (mins < 0) {
          mins = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
        return { days, hours, mins, secs };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [initial.days, initial.hours, initial.mins, initial.secs]);

  return time;
}

/** Marketing preview of My Learning — countdown to course start, Join Live Session, recordings & resources. */
export function TutorLedDashboardPreview({
  programTitle,
  nextSessionTitle,
  batchStartDate,
  scheduleLabel,
  trainerName,
  countdown,
}: TutorLedDashboardPreviewProps) {
  const cd = usePreviewCountdown(countdown);
  const trainerInitial = trainerName.replace(/^Mr\.?\s*/i, "").charAt(0) || "T";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* My Learning chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900/90 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        </span>
        <span className="min-w-0 truncate text-[10px] font-medium text-zinc-400">
          My Learning · Tutor Led · {programTitle}
        </span>
      </div>

      <div className="p-3">
        <p className="text-[10px] text-zinc-500">
          <span className="text-zinc-400">Tutor Led</span>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-zinc-300">{programTitle}</span>
        </p>
        <p className="mt-0.5 text-[9px] text-emerald-400/90">Live on Zoom · Enrolled</p>

        {/* Next live session — matches learner dashboard */}
        <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FFB800]">Next Live Session</p>
          <p className="mt-1.5 text-sm font-bold leading-snug text-white">{nextSessionTitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-zinc-500" aria-hidden />
              {batchStartDate}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" aria-hidden />
              {scheduleLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">
              {trainerInitial}
            </span>
            <span className="text-[11px] font-medium text-zinc-200">{trainerName}</span>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">Course starts in</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
              {cd.days > 0 ? (
                <span className="font-mono text-lg font-bold tabular-nums text-[#FFB800]">
                  {String(cd.days).padStart(2, "0")}
                  <span className="ml-0.5 text-[9px] font-semibold text-zinc-500">d</span>
                </span>
              ) : null}
              <span className="font-mono text-lg font-bold tabular-nums text-[#FFB800]">
                {String(cd.hours).padStart(2, "0")}
                <span className="text-zinc-600">:</span>
                {String(cd.mins).padStart(2, "0")}
                <span className="text-zinc-600">:</span>
                {String(cd.secs).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-0.5 text-[8px] text-zinc-500">
              {cd.days > 0 ? "Days · Hours · Mins · Secs" : "Hours · Mins · Secs until Day 1"}
            </p>
          </div>

          <div
            className="mt-3 flex w-full cursor-default items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-4 py-2.5 text-xs font-extrabold text-black shadow-[0_6px_20px_rgba(255,184,0,0.3)]"
            aria-hidden
          >
            <Video className="h-4 w-4" />
            Join Live Session
          </div>
          <p className="mt-1.5 text-center text-[9px] text-zinc-500">Opens Zoom when your batch goes live</p>
        </div>

        {/* Zoom badge row */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#2D8CFF]/30 bg-[#2D8CFF]/10 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-md bg-[#2D8CFF] px-1.5 py-0.5 text-[9px] font-bold text-white">
              zoom
            </span>
            <span className="text-[10px] font-semibold text-zinc-200">Join live course on Zoom</span>
          </div>
          <span className="rounded-full border border-[#2D8CFF]/40 bg-[#2D8CFF]/15 px-2 py-0.5 text-[8px] font-semibold text-[#7eb8ff]">
            Ready at start
          </span>
        </div>

        {/* Session recordings */}
        <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/80 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold text-white">Session Recordings</p>
            <span className="text-[8px] text-zinc-500">After each live day</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOCK_RECORDINGS.map((rec) => (
              <div
                key={rec.title}
                className="w-[108px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
              >
                <div className="relative aspect-video bg-black">
                  <Image
                    src={TUTOR_LED_CLASSROOM_IMAGE_SRC}
                    alt=""
                    fill
                    className="object-cover opacity-70"
                    sizes="108px"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Play className="h-6 w-6 fill-white/90 text-white/90" aria-hidden />
                  </span>
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-px text-[7px] font-medium text-zinc-200">
                    {rec.duration}
                  </span>
                </div>
                <p className="line-clamp-2 p-1 text-[8px] font-medium leading-snug text-zinc-400">{rec.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content resources */}
        <div className="mt-2 rounded-lg border border-amber-400/35 bg-gradient-to-br from-amber-500/10 to-zinc-950/90 p-2.5 ring-1 ring-amber-300/15">
          <div className="flex items-center gap-1.5">
            <MonitorPlay className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            <p className="text-[11px] font-bold text-amber-50">Course resources</p>
          </div>
          <ul className="mt-2 space-y-1">
            {MOCK_RESOURCES.map((item) => {
              const Icon = RESOURCE_ICONS[item.kind];
              return (
                <li
                  key={item.kind}
                  className="flex items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-1"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-400/20 text-amber-200">
                    <Icon className="h-3 w-3" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold text-amber-50">{item.label}</p>
                  </div>
                  <Download className="h-3 w-3 shrink-0 text-amber-300/80" aria-hidden />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
