import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { readAdminContent } from "@/lib/server/content-store";
import { filterPublishedWorkshops, isWorkshopProgram } from "@/lib/workshop-program";

function matchSlug(program: TutorLedProgramStored, key: string, decoded: string): boolean {
  return program.slug === key || program.slug === decoded;
}

export function normalizeTutorLedSlug(slug: string): string {
  const key = slug.trim();
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

async function loadMergedPrograms(): Promise<Map<string, TutorLedProgramStored>> {
  const content = await readAdminContent();
  // Admin JSON is the catalog source of truth (including []). Do not re-seed
  // built-in defaults on top — that made Delete look like a no-op.
  const apiList = Array.isArray(content.tutorLedPrograms)
    ? content.tutorLedPrograms
    : defaultTutorLedPrograms;
  const bySlug = new Map<string, TutorLedProgramStored>();
  for (const p of apiList) {
    const s = p.slug?.trim();
    if (!s) continue;
    bySlug.set(s, { ...p, slug: s });
  }
  return bySlug;
}

/** Any tutor-led program by slug (published or draft). */
export async function getTutorLedProgramBySlug(slug: string): Promise<TutorLedProgramStored | null> {
  const key = slug.trim();
  const decoded = normalizeTutorLedSlug(key);
  const bySlug = await loadMergedPrograms();
  return Array.from(bySlug.values()).find((p) => matchSlug(p, key, decoded)) ?? null;
}

/** Published tutor-led programs for catalog and marketing pages. */
export async function getPublishedTutorLedPrograms(): Promise<TutorLedProgramStored[]> {
  const bySlug = await loadMergedPrograms();
  return Array.from(bySlug.values()).filter((p) => p.published !== false);
}

/** Published one-day workshops (`programKind: workshop`). */
export async function getPublishedWorkshopPrograms(): Promise<TutorLedProgramStored[]> {
  return filterPublishedWorkshops(await getPublishedTutorLedPrograms());
}

/** Published multi-day tutor-led only (excludes workshops). */
export async function getPublishedTutorLedProgramsOnly(): Promise<TutorLedProgramStored[]> {
  const all = await getPublishedTutorLedPrograms();
  return all.filter((p) => !isWorkshopProgram(p));
}

/** Tutor-led program for enrolled learner flows (exams, hub). */
export async function getTutorLedProgramForLearner(slug: string): Promise<TutorLedProgramStored | null> {
  const program = await getTutorLedProgramBySlug(slug);
  if (!program || program.published === false) return null;
  return program;
}
