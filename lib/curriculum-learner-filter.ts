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

export function curriculumModuleHasLearnerContent(mod: CourseCurriculumModule): boolean {
  const items = curriculumItems(mod);
  if (items.length === 0) return false;
  return items.some(curriculumItemHasLearnerContent);
}

/** Learner UI + progress: only modules that exist in admin with real content. */
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
