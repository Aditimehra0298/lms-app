import type { CourseCurriculumItem } from "@/lib/content-schema";
import { flattenModuleCurriculumItems } from "@/lib/curriculum-learner-filter";

export type LessonNavEntry = {
  moduleIdx: number;
  entryIdx: number;
};

type CurriculumLike = {
  items?: CourseCurriculumItem[];
  subModules?: Array<{ items?: CourseCurriculumItem[] }>;
};

function moduleItems(module: CurriculumLike): CourseCurriculumItem[] {
  return flattenModuleCurriculumItems(module);
}

/** Flat list of video/reading lessons (exams are opened separately). */
export function flattenLearnerLessons(curriculum: CurriculumLike[]): LessonNavEntry[] {
  const out: LessonNavEntry[] = [];
  curriculum.forEach((module, moduleIdx) => {
    moduleItems(module).forEach((item, entryIdx) => {
      if (item.kind === "exam") return;
      out.push({ moduleIdx, entryIdx });
    });
  });
  return out;
}

export function findLessonNavIndex(
  lessons: LessonNavEntry[],
  moduleIdx: number,
  entryIdx: number,
): number {
  return lessons.findIndex((l) => l.moduleIdx === moduleIdx && l.entryIdx === entryIdx);
}
