export type LessonNavEntry = {
  moduleIdx: number;
  entryIdx: number;
};

type CurriculumLike = {
  items?: { kind?: string }[];
  subModules?: Array<{ items?: { kind?: string }[] }>;
};

function moduleItems(module: CurriculumLike): { kind?: string }[] {
  const top = module.items ?? [];
  const nested = (module.subModules ?? []).flatMap((sm) => sm.items ?? []);
  return top.length > 0 && nested.length > 0 ? [...top, ...nested] : top.length > 0 ? top : nested;
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
