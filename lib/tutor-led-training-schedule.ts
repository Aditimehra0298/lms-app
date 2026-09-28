import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export type TutorLedDurationSource = "curriculum" | "manual";

export const MIN_TRAINING_DAYS = 1;
export const MAX_TRAINING_DAYS = 30;

export function clampTrainingDays(raw: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return MIN_TRAINING_DAYS;
  return Math.min(MAX_TRAINING_DAYS, Math.max(MIN_TRAINING_DAYS, n));
}

/** Parse “Duration: 2 Days” / “5 Days” from marketing labels. */
export function parseTrainingDaysLabel(raw: string | undefined | null): number | null {
  const text = raw?.trim() ?? "";
  if (!text) return null;
  if (/\bweek/i.test(text)) return null;
  const match = text.match(/(\d+)\s*(?:day|days|d)\b/i);
  if (!match) return null;
  return clampTrainingDays(Number(match[1]));
}

export function catalogDurationLabel(days: number): string {
  return `Duration: ${formatTrainingDuration(days)}`;
}

/** True when this program is a short live Zoom course (Day 1…N), not a multi-week syllabus. */
export function isLiveDayCurriculum(
  program: Pick<TutorLedProgramStored, "curriculum" | "trainingDays">,
): boolean {
  if (typeof program.trainingDays === "number" && program.trainingDays >= 1) return true;
  const rows = program.curriculum ?? [];
  return rows.length > 0 && rows.every((week) => /^day\s*\d+/i.test((week.label ?? "").trim()));
}

/** Live sessions / journey steps — trainingDays when set, otherwise one per curriculum module. */
export function getCurriculumSessionCount(
  program: Pick<TutorLedProgramStored, "curriculum" | "trainingDays">,
): number {
  if (typeof program.trainingDays === "number" && program.trainingDays >= 1) {
    return clampTrainingDays(program.trainingDays);
  }
  return Math.max(1, program.curriculum?.length ?? 0);
}

/** Resize Zoom days. Each new day starts with an empty Zoom link (sessions do not share a meeting). */
export function applyTrainingDays(
  program: TutorLedProgramStored,
  daysRaw: number,
): TutorLedProgramStored {
  const days = clampTrainingDays(daysRaw);
  const previous = program.curriculum ?? [];
  const curriculum = Array.from({ length: days }, (_, index) => {
    const existing = previous[index];
    if (existing) {
      return {
        ...existing,
        week: index + 1,
        label: /^day\s*\d+/i.test((existing.label ?? "").trim())
          ? `Day ${index + 1}`
          : existing.label || `Day ${index + 1}`,
        sessionType: existing.sessionType?.trim() || "Live Zoom",
      };
    }
    return {
      week: index + 1,
      label: `Day ${index + 1}`,
      topic: days === 1 ? program.title : `${program.title} — Day ${index + 1}`,
      keyLearning: `Live Zoom class ${index + 1} of ${days}`,
      sessionType: "Live Zoom",
      liveJoinUrl: "",
      zoomMeetingId: "",
      zoomPasscode: "",
    };
  });
  const duration = formatTrainingDuration(days);
  const batchDetails = [...(program.batchDetails ?? [])];
  const durationIdx = batchDetails.findIndex((row) => row.label === "Duration");
  if (durationIdx >= 0) {
    batchDetails[durationIdx] = { ...batchDetails[durationIdx], value: duration };
  } else {
    batchDetails.unshift({ icon: "Clock", label: "Duration", value: duration });
  }
  return {
    ...program,
    trainingDays: days,
    curriculum,
    durationSource: "curriculum",
    batchDetails,
  };
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
  program: Pick<TutorLedProgramStored, "curriculum" | "batchDetails" | "durationSource" | "trainingDays">,
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
