import { defaultAdminContent } from "@/lib/content-schema";
import { readAdminContent } from "@/lib/server/content-store";
import { getTutorLedProgramBySlug } from "@/lib/server/tutor-led-catalog";
import { isWorkshopProgram } from "@/lib/workshop-program";

export type GrantableOfferingKind =
  | "self-paced"
  | "interactive"
  | "live"
  | "tutor-led"
  | "workshop";

export type GrantableOffering = {
  slug: string;
  title: string;
  kind: GrantableOfferingKind;
  kindLabel: string;
};

function kindLabel(kind: GrantableOfferingKind): string {
  if (kind === "self-paced") return "Self-paced";
  if (kind === "interactive") return "Interactive";
  if (kind === "live") return "Live catalog";
  if (kind === "tutor-led") return "Tutor-led";
  return "Workshop";
}

function catalogKind(format: string | undefined): GrantableOfferingKind {
  if (format === "interactive") return "interactive";
  if (format === "live") return "live";
  return "self-paced";
}

/** All programs an admin can grant without payment (self-paced, live catalog, tutor-led, workshops). */
export async function listAdminGrantableOfferings(): Promise<GrantableOffering[]> {
  const content = await readAdminContent();
  const courses =
    content.managedCourses && content.managedCourses.length > 0
      ? content.managedCourses
      : defaultAdminContent.managedCourses;
  const programs = Array.isArray(content.tutorLedPrograms) ? content.tutorLedPrograms : [];

  const bySlug = new Map<string, GrantableOffering>();

  for (const course of courses) {
    const slug = course.slug?.trim();
    if (!slug) continue;
    const kind = catalogKind(course.learningFormat);
    bySlug.set(slug, {
      slug,
      title: course.title?.trim() || slug,
      kind,
      kindLabel: kindLabel(kind),
    });
  }

  for (const program of programs) {
    const slug = program.slug?.trim();
    if (!slug) continue;
    const kind: GrantableOfferingKind = isWorkshopProgram(program) ? "workshop" : "tutor-led";
    bySlug.set(slug, {
      slug,
      title: program.title?.trim() || slug,
      kind,
      kindLabel: kindLabel(kind),
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    const kindOrder = a.kindLabel.localeCompare(b.kindLabel);
    if (kindOrder !== 0) return kindOrder;
    return a.title.localeCompare(b.title);
  });
}

export async function resolveGrantableOfferingTitle(slug: string, fallbackTitle?: string): Promise<string> {
  const key = slug.trim();
  if (!key) return fallbackTitle?.trim() || "";
  const offerings = await listAdminGrantableOfferings();
  const match = offerings.find((o) => o.slug === key);
  if (match?.title) return match.title;
  const tutor = await getTutorLedProgramBySlug(key);
  if (tutor?.title?.trim()) return tutor.title.trim();
  return fallbackTitle?.trim() || key;
}
