import type { CourseCurriculumModule } from "@/lib/content-schema";
import {
  readModuleExamScores,
  type ModuleExamScore,
} from "@/lib/learner-exam-scores";

export type ModuleAccessResult = {
  unlocked: boolean;
  /** Why the module is locked (for UI). */
  reason?: string;
};

type CurriculumModuleLike = {
  title?: string;
  items?: unknown;
  subModules?: unknown;
};

/**
 * Coursera-style access: learners may open any module freely.
 * Certificate / credentials stay gated separately via exam pass + completion rules.
 */
export function getLearnerModuleAccess(
  moduleIdx: number,
  curriculum: CurriculumModuleLike[],
  _completedModules: number[],
  _examScores: Record<string, ModuleExamScore>,
  _options?: { reviewMode?: boolean },
): ModuleAccessResult {
  if (moduleIdx < 0 || moduleIdx >= curriculum.length) {
    return { unlocked: false, reason: "Module not found." };
  }
  return { unlocked: true };
}

export function isLearnerModuleUnlocked(
  moduleIdx: number,
  curriculum: CurriculumModuleLike[],
  completedModules: number[],
  examScores: Record<string, ModuleExamScore>,
  options?: { reviewMode?: boolean },
): boolean {
  return getLearnerModuleAccess(moduleIdx, curriculum, completedModules, examScores, options)
    .unlocked;
}

/** Highest module index (0-based) the learner may open right now. */
export function highestUnlockedModuleIdx(
  curriculum: CurriculumModuleLike[],
  completedModules: number[],
  examScores: Record<string, ModuleExamScore>,
  options?: { reviewMode?: boolean },
): number {
  let max = 0;
  for (let i = 0; i < curriculum.length; i++) {
    if (isLearnerModuleUnlocked(i, curriculum, completedModules, examScores, options)) {
      max = i;
    } else {
      break;
    }
  }
  return max;
}

export function readExamScoresForAccess(courseSlug: string): Record<string, ModuleExamScore> {
  return readModuleExamScores(courseSlug);
}
