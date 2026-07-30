import type { CourseCurriculumModule } from "@/lib/content-schema";
import {
  readModuleExamScores,
  type ModuleExamScore,
} from "@/lib/learner-exam-scores";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";

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
 * Sequential module gate: Module N+1 opens only after Module N is marked complete
 * and (if Module N has an exam) that exam is passed.
 * Module 1 is always open. Review mode unlocks everything.
 */
export function getLearnerModuleAccess(
  moduleIdx: number,
  curriculum: CurriculumModuleLike[],
  completedModules: number[],
  examScores: Record<string, ModuleExamScore>,
  options?: { reviewMode?: boolean },
): ModuleAccessResult {
  if (options?.reviewMode) return { unlocked: true };
  if (moduleIdx <= 0) return { unlocked: true };
  if (moduleIdx >= curriculum.length) {
    return { unlocked: false, reason: "Module not found." };
  }

  const prevIdx = moduleIdx - 1;
  const prevNumber = prevIdx + 1;
  const prevModule = curriculum[prevIdx];

  if (!completedModules.includes(prevNumber)) {
    return {
      unlocked: false,
      reason: `Complete Module ${prevNumber} first (mark as completed).`,
    };
  }

  const examRow = getFirstExamRowInModule(prevModule as CourseCurriculumModule);
  if (examRow) {
    const score = examScores[String(prevNumber)];
    if (!score?.passed) {
      return {
        unlocked: false,
        reason: `Pass the Module ${prevNumber} exam before opening the next module.`,
      };
    }
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
