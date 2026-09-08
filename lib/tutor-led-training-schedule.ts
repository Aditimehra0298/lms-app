import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export type TutorLedDurationSource = "curriculum" | "manual";

/** Live sessions / journey steps — one per curriculum module. */
export function getCurriculumSessionCount(
  program: Pick<TutorLedProgramStored, "curriculum">,
): number {
  return Math.max(1, program.curriculum?.length ?? 0);
}

/** Human-readable training length from session count (intensive = days). */
export function formatTrainingDuration(sessionCount: number): string {
  const n = Math.max(1, Math.round(sessionCount));
  if (n === 1) return "1 Day";
  if (n <= 14) return `${n} Days`;
  if (n % 7 === 0) return `${n / 7} Weeks`;
  return `${n} Sessions`;
}

export function getDurationSource(
  program: Pick<TutorLedProgramStored, "durationSource">,
): TutorLedDurationSource {
  return program.durationSource === "manual" ? "manual" : "curriculum";
}

/** Duration label for marketing + learner hub. */
export function resolveTrainingDuration(
  program: Pick<TutorLedProgramStored, "curriculum" | "batchDetails" | "durationSource">,
): string {
  const manual = program.batchDetails?.find((d) => d.label === "Duration")?.value?.trim();
  if (getDurationSource(program) === "manual" && manual) return manual;
  return formatTrainingDuration(getCurriculumSessionCount(program));
}

/** Keep batchDetails Duration in sync when using curriculum-based duration. */
export function syncDurationBatchDetail(program: TutorLedProgramStored): TutorLedProgramStored {
  if (getDurationSource(program) === "manual") return program;

  const value = formatTrainingDuration(getCurriculumSessionCount(program));
  const batchDetails = [...(program.batchDetails ?? [])];
  const idx = batchDetails.findIndex((d) => d.label === "Duration");

  if (idx >= 0) {
    if (batchDetails[idx].value === value) return program;
    batchDetails[idx] = { ...batchDetails[idx], value };
  } else {
    batchDetails.push({ icon: "Clock", label: "Duration", value });
  }

  return { ...program, batchDetails };
}

/** Completed live sessions — prefer schedule days elapsed, fall back to Zoom recordings. */
export function computeCompletedLiveSessions(
  zoomRecordingCount: number,
  totalSessions: number,
  batchStart?: Date | null,
): number {
  const total = Math.max(1, totalSessions);
  const fromRecordings = Math.min(Math.max(0, zoomRecordingCount), total);
  if (!batchStart) return fromRecordings;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(batchStart);
  start.setHours(0, 0, 0, 0);
  if (today < start) return fromRecordings;

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  /** Full days finished after the batch started (day 0 still in progress → 0 completed). */
  const fromSchedule = Math.min(total, Math.max(0, diffDays));
  return Math.max(fromRecordings, fromSchedule);
}

export type JourneyStep = {
  day: number;
  title: string;
  status: "completed" | "in-progress" | "upcoming";
};

export function buildJourneySteps(
  curriculum: TutorLedProgramStored["curriculum"],
  completedSessions: number,
): JourneyStep[] {
  const steps = curriculum.map((w, i) => {
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
  const examUnlocked = completed >= total;
  const certificateEarned = progressPercent >= 100;

  return {
    completedCount: completed,
    inProgressCount,
    upcomingCount,
    progressPercent,
    examUnlocked,
    certificateEarned,
  };
}
