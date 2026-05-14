import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { readAdminContent } from "@/lib/server/content-store";

export async function getTutorLedPrograms(): Promise<TutorLedProgramStored[]> {
  const content = await readAdminContent();
  const list = content.tutorLedPrograms;
  return list && list.length > 0 ? list : defaultTutorLedPrograms;
}

export async function getPublishedTutorLedProgramBySlug(slug: string): Promise<TutorLedProgramStored | null> {
  const programs = await getTutorLedPrograms();
  return programs.find((p) => p.slug === slug && p.published) ?? null;
}
