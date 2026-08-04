import type { CourseCurriculumItem, CourseCurriculumModule } from "@/lib/content-schema";

function curriculumItems(mod: CourseCurriculumModule): CourseCurriculumItem[] {
  const top = Array.isArray(mod.items) ? mod.items : [];
  const nested = (mod.subModules ?? []).flatMap((sm) =>
    Array.isArray(sm.items) ? sm.items : [],
  );
  return [...top, ...nested];
}

/** True when an admin row has real uploaded/linked learner content (not empty template placeholders). */
export function curriculumItemHasLearnerContent(item: CourseCurriculumItem): boolean {
  if (item.videoUrl?.trim()) return true;
  if (item.examUploadUrl?.trim()) return true;
  if (item.pdfUrl?.trim()) return true;
  if (item.pptUrl?.trim()) return true;
  if (item.podcastUrl?.trim()) return true;
  if (item.resourceUrl?.trim()) return true;
  if (item.downloadUrl?.trim()) return true;
  if (item.webhookUrl?.trim()) return true;
  if (item.description?.trim()) return true;
  if (item.about?.trim()) return true;
  if (Array.isArray(item.learningOutcomes) && item.learningOutcomes.some((o) => o.trim())) {
    return true;
  }
  return false;
}

/**
 * Module should appear for learners when admin saved it in the curriculum editor.
 * Previously we hid modules until media was uploaded — that made “22 modules” show as “4”.
 */
export function curriculumModuleHasLearnerContent(mod: CourseCurriculumModule): boolean {
  const title = typeof mod.title === "string" ? mod.title.trim() : "";
  if (title) return true;
  const items = curriculumItems(mod);
  if (items.length === 0) return false;
  if (items.some((i) => (i.label ?? "").trim())) return true;
  return items.some(curriculumItemHasLearnerContent);
}

/** Learner UI + progress: every admin-saved module (title or lesson rows). */
export function curriculumModulesForLearner(
  modules: CourseCurriculumModule[] | null | undefined,
): CourseCurriculumModule[] {
  if (!Array.isArray(modules) || modules.length === 0) return [];
  const filtered = modules.filter(curriculumModuleHasLearnerContent);
  return filtered.length > 0 ? filtered : modules;
}

export function countLearnerCurriculumModules(
  curriculum?: CourseCurriculumModule[] | null,
): number {
  return curriculumModulesForLearner(curriculum).length;
}

/** Raw admin module count (no filtering) — useful for admin stats. */
export function countCurriculumModulesRaw(
  curriculum?: CourseCurriculumModule[] | null,
): number {
  return Array.isArray(curriculum) ? curriculum.length : 0;
}
