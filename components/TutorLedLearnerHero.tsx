"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TUTOR_LED_LEARNER_HERO_BG_SRC } from "@/lib/tutor-led-marketing-assets";
import {
  tlCard,
  tlCardGold,
  tlGoldOutline,
  tlGoldSolid,
  tlGreenBadge,
  TL,
} from "@/lib/tutor-led-learner-theme";
import { resolveLearnerSection } from "@/lib/tutor-led-learner-section";
import {
  resolveTrainingDuration,
  type JourneyStep,
} from "@/lib/tutor-led-training-schedule";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Globe,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react";

type Props = {
  program: TutorLedProgramStored;
  zoomJoinUrl: string | null;
  progressPercent: number;
  journeySteps: JourneyStep[];
  completedCount: number;
  inProgressCount: number;
  upcomingCount: number;
  firstRecordingUrl?: string;
  sessionsAttended: number;
  recordingsWatched: number;
  totalSessions: number;
  examUnlocked: boolean;
};

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function TutorLedLearnerHero({
  program,
  zoomJoinUrl,
  progressPercent,
  journeySteps,
  completedCount,
  inProgressCount,
  upcomingCount,
  firstRecordingUrl,
  sessionsAttended,
  recordingsWatched,
  totalSessions,
  examUnlocked,
}: Props) {
  const batchLabel = program.batchLabel?.trim() || program.nextBatchDate;
  const duration = resolveTrainingDuration(program);
  const heroBg = program.learnerHeroBgSrc?.trim() || TUTOR_LED_LEARNER_HERO_BG_SRC;
  const section = useMemo(() => resolveLearnerSection(program), [program]);
  const ringColor = progressPercent >= 80 ? TL.green : TL.gold;
  const allSessionsDone = sessionsAttended >= totalSessions;

  const donutStyle = useMemo(
    () => ({
      background: `conic-gradient(${ringColor} 0% ${progressPercent}%, #1a1a1a ${progressPercent}% 100%)`,
    }),
    [progressPercent, ringColor],
  );

  const checklistDone = [
    allSessionsDone || sessionsAttended > 0,
    sessionsAttended > 0,
    recordingsWatched > 0,
    sessionsAttended > 1,
  ];
  const checklist = section.checklistItems.map((label, i) => ({
    label,
    done: checklistDone[i] ?? false,
  }));

  return (
    <div className="space-y-4">
      <article className={`${tlCardGold} tl-gold-glow relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-[length:min(52%,420px)_auto] bg-right-top bg-no-repeat opacity-90"
          style={{ backgroundImage: `url(${heroBg})` }}
          role="img"
          aria-label={program.learnerHeroBgAlt?.trim() || "Course achievement badge"}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/92 to-black/55"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(255,193,7,0.2) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative z-[1] grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <span className={tlGreenBadge}>{section.enrolledBadgeLabel}</span>
            <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white md:text-[1.75rem] lg:text-3xl">
              {program.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{program.subtitle?.trim() || program.badge}</p>

            <div className="mt-5 grid gap-4 border-y border-[#FFC107]/10 py-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetaCell label="Batch" value={batchLabel} />
              <MetaCell label="Trainer" value={program.trainer.name} />
              <MetaCell label="Duration" value={duration} />
              <MetaCell label="Language" value={program.language?.trim() || "English"} />
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border border-[#FFC107]/10 bg-black/40 px-3 py-2"
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${item.done ? "text-[#4CAF50]" : "text-zinc-600"}`}
                    aria-hidden
                  />
                  <span className={`text-xs ${item.done ? "text-zinc-200" : "text-zinc-500"}`}>{item.label}</span>
                </li>
              ))}
            </ul>

            <div
              className={`mt-4 rounded-xl border p-4 ${
                examUnlocked
                  ? "border-[#FFC107]/35 bg-gradient-to-r from-[#FFC107]/14 to-[#FFC107]/5"
                  : "border-white/8 bg-black/30"
              }`}
            >
              <p className="text-sm font-semibold text-white">
                {examUnlocked ? section.examEligibleTitle : section.examLockedTitle}
              </p>
              {examUnlocked ? (
                <Link
                  href={`/my-learning/course/${program.slug}/exam?module=final`}
                  className={`${tlGoldSolid} mt-3`}
                >
                  {section.startExamLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">{section.examLockedHint}</p>
              )}
            </div>

            <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/12 bg-black/40 px-3 py-2 text-xs text-zinc-300">
              <Calendar className="h-4 w-4 shrink-0 text-[#FFC107]" aria-hidden />
              <span>
                {section.nextSessionPrefix}{" "}
                <span className="font-semibold text-white">
                  {program.nextBatchDate}
                  {program.schedule ? ` · ${program.schedule}` : ""}
                </span>
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {zoomJoinUrl ? (
                <a href={zoomJoinUrl} target="_blank" rel="noopener noreferrer" className={tlGoldSolid}>
                  <Video className="h-4 w-4" aria-hidden />
                  {section.joinZoomLabel}
                </a>
              ) : null}
              {firstRecordingUrl ? (
                <a href={firstRecordingUrl} target="_blank" rel="noopener noreferrer" className={tlGoldOutline}>
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  {section.watchRecordingLabel}
                </a>
              ) : (
                <Link href="#session-recordings" className={tlGoldOutline}>
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  {section.watchRecordingLabel}
                </Link>
              )}
              <Link href="#learning-materials" className={tlGoldOutline}>
                <Download className="h-4 w-4" aria-hidden />
                {section.downloadNotesLabel}
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 lg:pt-1">
            <div className="tl-progress-ring relative grid h-40 w-40 place-items-center">
              <div className="absolute inset-0 rounded-full opacity-95" style={donutStyle} aria-hidden />
              <div className="relative flex h-[6.25rem] w-[6.25rem] flex-col items-center justify-center rounded-full bg-black text-center ring-2 ring-[#FFC107]/10">
                <span
                  className="text-3xl font-extrabold"
                  style={{ color: progressPercent >= 80 ? TL.green : TL.gold }}
                >
                  {progressPercent}%
                </span>
                <span className="text-[11px] font-medium text-zinc-400">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <article className={tlCard}>
          <h2 className="text-lg font-bold text-white">{section.learningJourneyTitle}</h2>
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="flex min-w-[520px] items-start justify-between px-2">
              {journeySteps.map((step, i) => {
                const isLast = i === journeySteps.length - 1;
                const lineClass =
                  step.status === "completed"
                    ? "bg-[#4CAF50]"
                    : step.status === "in-progress"
                      ? "bg-gradient-to-r from-[#4CAF50] to-[#FFC107]"
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
                          ? "border-[#4CAF50] bg-[#4CAF50]/15 text-[#66BB6A]"
                          : step.status === "in-progress"
                            ? "border-[#FFC107] bg-[#FFC107]/15 text-[#FFC107]"
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
                          ? "text-[#66BB6A]"
                          : step.status === "in-progress"
                            ? "text-[#FFC107]"
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

        <article className={tlCard}>
          <h2 className="text-lg font-bold text-white">{section.courseProgressTitle}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2 text-zinc-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF50]" aria-hidden />
              Completed ({completedCount} sessions)
            </li>
            <li className="flex items-center gap-2 text-zinc-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFC107]" aria-hidden />
              In progress ({inProgressCount} sessions)
            </li>
            <li className="flex items-center gap-2 text-zinc-200">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" aria-hidden />
              Upcoming ({upcomingCount} sessions)
            </li>
          </ul>
          <Link href="#live-curriculum" className={`${tlGoldOutline} mt-5 w-full text-xs`}>
            <Globe className="h-4 w-4" aria-hidden />
            View progress report
          </Link>
        </article>
      </div>
    </div>
  );
}

export {
  buildJourneySteps,
  computeProgramProgress,
  type JourneyStep,
} from "@/lib/tutor-led-training-schedule";
