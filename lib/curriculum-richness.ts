import type { CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";

/** Score used to pick the richer of JSON vs MySQL curriculum copies. */
export function curriculumRichnessScore(
  mods?: CourseCurriculumModule[] | null,
): number {
  if (!Array.isArray(mods) || mods.length === 0) return 0;
  let media = 0;
  let lessons = 0;
  let textChars = 0;
  for (const m of mods) {
    const rows = [
      ...(m.items ?? []),
      ...((m.subModules ?? []).flatMap((s) => s.items ?? [])),
    ];
    lessons += rows.length;
    const modDesc = m.description?.trim() ?? "";
    if (modDesc) textChars += Math.min(modDesc.length, 800);
    for (const item of rows) {
      if (
        item.videoUrl ||
        item.examUploadUrl ||
        item.pdfUrl ||
        item.downloadUrl ||
        item.pptUrl ||
        item.podcastUrl ||
        item.resourceUrl
      ) {
        media += 1;
      }
      const desc = item.description?.trim() ?? "";
      const about = item.about?.trim() ?? "";
      if (desc) textChars += Math.min(desc.length, 800);
      if (about) textChars += Math.min(about.length, 800);
      const outcomes = Array.isArray(item.learningOutcomes)
        ? item.learningOutcomes.filter((o) => o?.trim()).length
        : 0;
      textChars += outcomes * 40;
    }
  }
  // Prefer more modules, then more lessons, then media + learner copy text.
  return mods.length * 100_000 + lessons * 1_000 + media * 100 + Math.min(textChars, 50_000);
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
