import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export type TutorLedContentMode = "auto" | "manual";

export type TutorLedCurriculumDay = {
  id: string;
  label: string;
  title: string;
  duration: string;
  kind: "recording" | "lab" | "live";
  recordingUrl?: string;
  imageUrl?: string;
};

export type TutorLedCurriculumWeek = TutorLedProgramStored["curriculum"][number] & {
  weekImageUrl?: string;
  days?: TutorLedCurriculumDay[];
};

export function newCurriculumDayId() {
  return `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Default 5 days per week from week topic (automatic mode). */
export function autoGenerateCurriculumDays(
  week: TutorLedProgramStored["curriculum"][number],
  weekIndex: number,
): TutorLedCurriculumDay[] {
  const base = week.topic || week.label || `Week ${week.week}`;
  return [1, 2, 3, 4, 5].map((dayNum, i) => {
    const isLab = i === 4;
    const isLive = dayNum <= 2;
    return {
      id: `w${weekIndex}-d${dayNum}-auto`,
      label: `Day ${dayNum}`,
      title: isLab
        ? `${week.label}: ${base} — Lab & recap`
        : `${week.label}: ${base} — ${isLive ? "Live session" : `Part ${dayNum}`}`,
      duration: isLab ? "1h 45m" : isLive ? "3h 00m" : `${2 + (i % 2)}h ${10 + i * 5}m`,
      kind: isLab ? ("lab" as const) : isLive ? ("live" as const) : ("recording" as const),
      imageUrl: (week as TutorLedCurriculumWeek).weekImageUrl,
    };
  });
}

export function resolveCurriculumDays(
  program: Pick<TutorLedProgramStored, "curriculumMode" | "curriculum">,
  week: TutorLedProgramStored["curriculum"][number],
  weekIndex: number,
): TutorLedCurriculumDay[] {
  const mode = program.curriculumMode ?? "auto";
  const weekExt = week as TutorLedCurriculumWeek;
  if (mode === "manual" && weekExt.days?.length) {
    return weekExt.days;
  }
  return autoGenerateCurriculumDays(week, weekIndex);
}

export function defaultManualDaysFromWeek(
  week: TutorLedProgramStored["curriculum"][number],
  weekIndex: number,
): TutorLedCurriculumDay[] {
  return autoGenerateCurriculumDays(week, weekIndex).map((d) => ({
    ...d,
    id: newCurriculumDayId(),
  }));
}
