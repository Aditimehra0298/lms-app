import type { CourseCurriculumModule } from "@/lib/content-schema";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";

/** Default: learner must score at least this % on each module exam to pass that exam. */
export const DEFAULT_MODULE_EXAM_PASS_PERCENT = 70;

export type ModuleExamScore = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  updatedAt: string;
};

export function examScoresStorageKey(courseSlug: string): string {
  return `sft_module_exam_scores_${courseSlug.trim()}`;
}

function normalizeEntry(raw: unknown): ModuleExamScore | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      correct: raw,
      total: 100,
      percent: Math.round(raw),
      passed: raw >= DEFAULT_MODULE_EXAM_PASS_PERCENT,
      updatedAt: new Date().toISOString(),
    };
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const correct = Number(o.correct);
  const total = Number(o.total);
  const percent =
    typeof o.percent === "number"
      ? Math.round(o.percent)
      : total > 0
        ? Math.round((correct / total) * 100)
        : 0;
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;
  return {
    correct,
    total,
    percent,
    passed: o.passed === true || percent >= DEFAULT_MODULE_EXAM_PASS_PERCENT,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export function readModuleExamScores(courseSlug: string): Record<string, ModuleExamScore> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(examScoresStorageKey(courseSlug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, ModuleExamScore> = {};
    for (const [key, val] of Object.entries(parsed ?? {})) {
      const entry = normalizeEntry(val);
      if (entry) out[key] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

/** Module numbers (1-based) that have an exam row in admin curriculum. */
export function examModuleNumbers(curriculum: CourseCurriculumModule[]): number[] {
  const out: number[] = [];
  curriculum.forEach((mod, idx) => {
    if (getFirstExamRowInModule(mod)) out.push(idx + 1);
  });
  return out;
}

export function recordModuleExamAttempt(input: {
  courseSlug: string;
  moduleNumber: number;
  correct: number;
  total: number;
  passingPercent?: number;
}): ModuleExamScore {
  const passing = input.passingPercent ?? DEFAULT_MODULE_EXAM_PASS_PERCENT;
  const total = Math.max(1, input.total);
  const correct = Math.max(0, Math.min(input.correct, total));
  const percent = Math.round((correct / total) * 100);
  const passedThisAttempt = percent >= passing;

  const key = String(input.moduleNumber);
  const prev = readModuleExamScores(input.courseSlug)[key];
  const entry: ModuleExamScore = {
    correct,
    total,
    percent,
    passed: (prev?.passed ?? false) || passedThisAttempt,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const all = readModuleExamScores(input.courseSlug);
    all[key] = entry;
    window.localStorage.setItem(examScoresStorageKey(input.courseSlug), JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: input.courseSlug } }));
  }
  return entry;
}

/**
 * Combined course grade: (sum of marks obtained) / (sum of marks available) × 100
 * across all module exams — standard percentage aggregation.
 */
export function computeCombinedExamGrade(
  courseSlug: string,
  curriculum: CourseCurriculumModule[],
): {
  combinedPercent: number | null;
  totalCorrect: number;
  totalQuestions: number;
  allExamsPassed: boolean;
  examModuleNumbers: number[];
  scores: Record<string, ModuleExamScore>;
} {
  const scores = readModuleExamScores(courseSlug);
  const modules = examModuleNumbers(curriculum);
  let totalCorrect = 0;
  let totalQuestions = 0;
  let allExamsPassed = modules.length > 0;

  for (const moduleNumber of modules) {
    const entry = scores[String(moduleNumber)];
    if (!entry) {
      allExamsPassed = false;
      continue;
    }
    if (!entry.passed) allExamsPassed = false;
    totalCorrect += entry.correct;
    totalQuestions += entry.total;
  }

  if (modules.length === 0) {
    allExamsPassed = false;
  }

  const combinedPercent =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  return {
    combinedPercent,
    totalCorrect,
    totalQuestions,
    allExamsPassed,
    examModuleNumbers: modules,
    scores,
  };
}

/** Certificate + transcript unlock: all modules done, and every module exam passed when exams exist. */
export function learnerCredentialsEligible(
  curriculum: CourseCurriculumModule[],
  completedModules: number[],
  allExamsPassed: boolean,
): {
  allModulesDone: boolean;
  examsRequired: boolean;
  eligible: boolean;
} {
  const allModulesDone =
    curriculum.length > 0 && curriculum.every((_, idx) => completedModules.includes(idx + 1));
  const examsRequired = examModuleNumbers(curriculum).length > 0;
  const eligible = allModulesDone && (!examsRequired || allExamsPassed);
  return { allModulesDone, examsRequired, eligible };
}
