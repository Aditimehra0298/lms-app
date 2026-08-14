import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { deriveCourseProgress } from "@/lib/learner-course-progress";
import {
  computeCompletedLiveSessions,
  computeProgramProgress,
  getCurriculumSessionCount,
  resolveTrainingDuration,
} from "@/lib/tutor-led-training-schedule";
import { getProgramTrainingDays, isWorkshopProgram } from "@/lib/workshop-program";

export type TutorLedExploreCard = {
  slug: string;
  title: string;
  subtitle: string;
  image?: string;
  duration: string;
  trainingDays: number;
  price: number;
  nextBatchDate: string;
};

export function buildTutorLedExploreCards(programs: TutorLedProgramStored[]): TutorLedExploreCard[] {
  return programs
    .filter((p) => p.published && p.slug?.trim() && !isWorkshopProgram(p))
    .map((p) => ({
      slug: p.slug.trim(),
      title: p.title,
      subtitle: p.subtitle?.trim() || p.badge?.trim() || "Tutor led live training",
      image: p.heroSrc?.trim() || p.learnerHeroSrc?.trim() || undefined,
      duration: resolveTrainingDuration(p),
      trainingDays: getCurriculumSessionCount(p),
      price: p.price,
      nextBatchDate: p.nextBatchDate?.trim() || "Upcoming batch",
    }));
}

export type TutorLedLiveHubRow = {
  slug: string;
  title: string;
  trainingDays: number;
  completedDays: number;
  duration: string;
  status: string;
  image?: string;
  examUnlocked: boolean;
  progressPercent: number;
};

export function mergeTutorLedPrograms(
  adminList?: TutorLedProgramStored[],
): TutorLedProgramStored[] {
  const bySlug = new Map<string, TutorLedProgramStored>();
  for (const p of adminList ?? []) {
    const key = p.slug?.trim();
    if (!key) continue;
    bySlug.set(key, { ...p, slug: key });
  }
  return Array.from(bySlug.values());
}

export function enrichTutorLedLiveHubRow(
  slug: string,
  fallback: { title: string; image?: string },
  programs: TutorLedProgramStored[],
): TutorLedLiveHubRow {
  const program = programs.find((p) => p.slug === slug.trim());
  const trainingDays = program ? getProgramTrainingDays(program) : 4;
  const completedDays = program
    ? computeCompletedLiveSessions(program.zoomRecordings?.length ?? 0, trainingDays)
    : 0;
  const { progressPercent, examUnlocked } = computeProgramProgress(trainingDays, completedDays);
  const { status } = deriveCourseProgress(completedDays, trainingDays);

  return {
    slug: slug.trim(),
    title: program?.title?.trim() || fallback.title,
    trainingDays,
    completedDays,
    duration: program ? resolveTrainingDuration(program) : `${trainingDays} Days`,
    status,
    image:
      program?.learnerHeroSrc?.trim() ||
      program?.heroSrc?.trim() ||
      fallback.image?.trim() ||
      undefined,
    examUnlocked,
    progressPercent,
  };
}
