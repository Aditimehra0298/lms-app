import type { CourseCurriculumModule } from "@/lib/content-schema";
import {
  computeCombinedExamGrade,
  examModuleNumbers,
  readModuleExamScores,
} from "@/lib/learner-exam-scores";
import { modulePreviewProgress, type PreviewGateModule } from "@/lib/learner-preview-gate";

export type CoursePlayerProgressSnapshot = {
  totalModules: number;
  completedModules: number;
  examsTotal: number;
  examsAttempted: number;
  examsPassed: number;
  /** Average % across attempted module exams only; null if none attempted. */
  averageExamPercent: number | null;
  /** Weighted combined % (all attempted questions); null if none. */
  combinedExamPercent: number | null;
  modulesWithVideoProgress: number;
};

export function computeCoursePlayerProgressSnapshot(
  courseSlug: string,
  curriculum: CourseCurriculumModule[],
  completedModuleNumbers: number[],
  watchedSecondsByModule: Record<number, number>,
): CoursePlayerProgressSnapshot {
  const totalModules = curriculum.length;
  const completedModules = completedModuleNumbers.length;
  const examMods = examModuleNumbers(curriculum);
  const scores = readModuleExamScores(courseSlug);
  const examsTotal = examMods.length;

  let examsAttempted = 0;
  let examsPassed = 0;
  const attemptPercents: number[] = [];

  for (const moduleNumber of examMods) {
    const entry = scores[String(moduleNumber)];
    if (!entry) continue;
    examsAttempted += 1;
    if (entry.passed) examsPassed += 1;
    attemptPercents.push(entry.percent);
  }

  const averageExamPercent =
    attemptPercents.length > 0
      ? Math.round(attemptPercents.reduce((a, b) => a + b, 0) / attemptPercents.length)
      : null;

  const combined = computeCombinedExamGrade(courseSlug, curriculum);

  let modulesWithVideoProgress = 0;
  curriculum.forEach((mod, idx) => {
    const progress = modulePreviewProgress(
      mod as PreviewGateModule,
      watchedSecondsByModule[idx + 1] ?? 0,
    );
    if (progress.required > 0 && progress.watched > 0) modulesWithVideoProgress += 1;
    else if (progress.required === 0 && completedModuleNumbers.includes(idx + 1)) {
      modulesWithVideoProgress += 1;
    }
  });

  return {
    totalModules,
    completedModules,
    examsTotal,
    examsAttempted,
    examsPassed,
    averageExamPercent,
    combinedExamPercent: combined.combinedPercent,
    modulesWithVideoProgress,
  };
}
