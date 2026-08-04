import type { CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";

/** Score used to pick the richer of JSON vs MySQL curriculum copies. */
export function curriculumRichnessScore(
  mods?: CourseCurriculumModule[] | null,
): number {
  if (!Array.isArray(mods) || mods.length === 0) return 0;
  let media = 0;
  for (const m of mods) {
    const rows = [
      ...(m.items ?? []),
      ...((m.subModules ?? []).flatMap((s) => s.items ?? [])),
    ];
    for (const item of rows) {
      if (
        item.videoUrl ||
        item.examUploadUrl ||
        item.pdfUrl ||
        item.downloadUrl ||
        item.pptUrl
      ) {
        media += 1;
      }
    }
  }
  return mods.length * 1000 + media;
}

/** Prefer the curriculum with more modules / uploaded media. */
export function pickRicherCurriculum(
  a?: CourseCurriculumModule[] | null,
  b?: CourseCurriculumModule[] | null,
): CourseCurriculumModule[] | undefined {
  const aScore = curriculumRichnessScore(a);
  const bScore = curriculumRichnessScore(b);
  if (bScore > aScore) return Array.isArray(b) ? b : undefined;
  if (aScore > 0) return Array.isArray(a) ? a : undefined;
  if (Array.isArray(b) && b.length > 0) return b;
  return Array.isArray(a) ? a : undefined;
}

export function mergeCoursePreferringRicherCurriculum(
  primary: ManagedCourse,
  secondary: ManagedCourse | null | undefined,
): ManagedCourse {
  if (!secondary) return primary;
  const curriculum = pickRicherCurriculum(primary.curriculum, secondary.curriculum);
  return curriculum && curriculum !== primary.curriculum
    ? { ...primary, curriculum }
    : primary;
}
