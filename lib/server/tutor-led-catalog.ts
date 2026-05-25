import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { readAdminContent } from "@/lib/server/content-store";

/** Normalize URL slug (decode, trim). */
export function normalizeTutorLedSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).trim();
  } catch {
    return slug.trim();
  }
}

/** Merge admin overrides onto built-in defaults (by slug). */
function mergeTutorLedPrograms(adminList: TutorLedProgramStored[] | undefined): TutorLedProgramStored[] {
  const bySlug = new Map<string, TutorLedProgramStored>();
  for (const p of defaultTutorLedPrograms) bySlug.set(p.slug, p);
  for (const p of adminList ?? []) {
    const key = p.slug?.trim();
    if (!key) continue;
    const base = bySlug.get(key);
    bySlug.set(key, base ? { ...base, ...p, slug: key } : { ...p, slug: key });
  }
  return Array.from(bySlug.values());
}

export async function getTutorLedPrograms(): Promise<TutorLedProgramStored[]> {
  const content = await readAdminContent();
  const list = content.tutorLedPrograms;
  if (!list || list.length === 0) return defaultTutorLedPrograms;
  return mergeTutorLedPrograms(list);
}

export async function getTutorLedProgramBySlug(slug: string): Promise<TutorLedProgramStored | null> {
  const key = normalizeTutorLedSlug(slug);
  if (!key) return null;
  const programs = await getTutorLedPrograms();
  return programs.find((p) => p.slug === key) ?? null;
}

export async function getPublishedTutorLedPrograms(): Promise<TutorLedProgramStored[]> {
  const programs = await getTutorLedPrograms();
  return programs.filter((p) => p.published);
}

export async function getPublishedTutorLedProgramBySlug(slug: string): Promise<TutorLedProgramStored | null> {
  const program = await getTutorLedProgramBySlug(slug);
  return program?.published ? program : null;
}

export async function getFirstPublishedTutorLedSlug(): Promise<string | null> {
  const published = await getPublishedTutorLedPrograms();
  const preferred = published.find((p) => p.slug === "advanced-cyber-security-professional");
  return preferred?.slug ?? published[0]?.slug ?? null;
}
