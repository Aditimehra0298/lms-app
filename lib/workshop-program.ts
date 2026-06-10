import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import { getCurriculumSessionCount } from "@/lib/tutor-led-training-schedule";
import { tutorLedTemplatePath } from "@/lib/tutor-led-routes";

export type ProgramKind = "tutor-led" | "workshop";

const publishedWorkshopSlugs = new Set(
  defaultTutorLedPrograms
    .filter((p) => p.published && p.programKind === "workshop")
    .map((p) => p.slug),
);

export function resolveProgramKind(
  program: Pick<TutorLedProgramStored, "programKind">,
): ProgramKind {
  return program.programKind === "workshop" ? "workshop" : "tutor-led";
}

export function isWorkshopProgram(
  program: Pick<TutorLedProgramStored, "programKind"> | null | undefined,
): boolean {
  return program?.programKind === "workshop";
}

export function workshopLandingHref(slug?: string | null): string {
  const key = slug?.trim();
  if (!key) return "/workshops";
  return `/workshops/${encodeURIComponent(key)}`;
}

export function hasPublishedWorkshopProgram(slug: string): boolean {
  const key = slug?.trim();
  return Boolean(key && publishedWorkshopSlugs.has(key));
}

/** Marketing URL — workshop → `/workshops/…`, tutor-led → `/tutor-led/…`. */
export function programLandingHref(program: Pick<TutorLedProgramStored, "slug" | "programKind">): string {
  return isWorkshopProgram(program)
    ? workshopLandingHref(program.slug)
    : tutorLedTemplatePath(program.slug);
}

/** Workshops are always a single live day on the calendar. */
export function getProgramTrainingDays(program: TutorLedProgramStored): number {
  if (isWorkshopProgram(program)) return 1;
  return getCurriculumSessionCount(program);
}

export type WorkshopCatalogCard = {
  slug: string;
  title: string;
  date: string;
  instructor: string;
  image: string;
  registerHref: string;
};

export function mapProgramToWorkshopCard(program: TutorLedProgramStored): WorkshopCatalogCard {
  const schedule = program.schedule?.trim();
  const dateLine = [program.nextBatchDate?.trim(), schedule].filter(Boolean).join(schedule ? " · " : "");
  return {
    slug: program.slug,
    title: program.title,
    date: dateLine || "Date announced soon",
    instructor: program.trainer?.name?.trim() || "SF Trainings expert",
    image: program.heroSrc?.trim() || "/p8.png",
    registerHref: workshopLandingHref(program.slug),
  };
}

export function filterPublishedWorkshops(programs: TutorLedProgramStored[]): TutorLedProgramStored[] {
  return programs.filter((p) => p.published !== false && isWorkshopProgram(p));
}
