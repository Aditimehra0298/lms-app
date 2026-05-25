import type { CourseCurriculumItem, CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";

function getFirstExamRowInModule(mod: CourseCurriculumModule | undefined): CourseCurriculumItem | undefined {
  if (!mod) return undefined;
  const top = mod.items?.find((i) => i.kind === "exam");
  if (top) return top;
  for (const sm of mod.subModules ?? []) {
    const row = sm.items.find((i) => i.kind === "exam");
    if (row) return row;
  }
  return undefined;
}

export type ManagedCourseExamLink = {
  href: string;
  label: string;
  slot: string;
};

function hasFinalExamPayload(fe: ManagedCourse["finalExam"]): boolean {
  if (!fe) return false;
  return (
    !!fe.title?.trim() ||
    !!fe.examUploadUrl ||
    fe.timedExam === true ||
    typeof fe.examDurationMinutes === "number" ||
    typeof fe.passingScorePercent === "number"
  );
}

/** Build learner exam URLs from admin curriculum + optional final exam. */
export function examLinksFromManagedCourse(course: ManagedCourse): ManagedCourseExamLink[] {
  const out: ManagedCourseExamLink[] = [];
  if (course.curriculum?.length) {
    course.curriculum.forEach((mod, idx) => {
      const row = getFirstExamRowInModule(mod);
      if (!row) return;
      out.push({
        href: `/my-learning/course/${course.slug}/exam?module=${idx + 1}`,
        label: row.label?.trim() || `${mod.title} — Exam`,
        slot: `Module ${idx + 1}`,
      });
    });
  }
  if (hasFinalExamPayload(course.finalExam)) {
    const fe = course.finalExam!;
    out.push({
      href: `/my-learning/course/${course.slug}/exam?final=1`,
      label: fe.title?.trim() || "Final examination",
      slot: "Final",
    });
  }
  return out;
}

/** Map dashboard “My courses” row to a catalog slug when `slug` is missing. */
export function resolveLearningCourseSlug(
  row: { title: string; slug?: string },
  catalog: ManagedCourse[],
  titleToSlug: (t: string) => string,
): string | null {
  if (row.slug) {
    const hit = catalog.find((c) => c.slug === row.slug);
    if (hit) return hit.slug;
  }
  const t = row.title.trim().toLowerCase();
  const exact = catalog.find((c) => c.title.trim().toLowerCase() === t);
  if (exact) return exact.slug;
  const guess = titleToSlug(row.title);
  const bySlug = catalog.find((c) => c.slug === guess);
  if (bySlug) return bySlug.slug;
  const first = row.title.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first.length >= 4) {
    const fuzzy = catalog.find((c) => c.title.toLowerCase().includes(first));
    if (fuzzy) return fuzzy.slug;
  }
  return null;
}
