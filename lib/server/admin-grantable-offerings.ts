import { defaultAdminContent } from "@/lib/content-schema";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
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
  const programs = content.tutorLedPrograms ?? [];

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

  // Merge defaults + admin tutor-led / workshops (admin list may omit defaults).
  const programMap = new Map<string, (typeof defaultTutorLedPrograms)[number]>();
  for (const p of defaultTutorLedPrograms) {
    if (p.slug?.trim()) programMap.set(p.slug.trim(), p);
  }
  for (const p of programs) {
    const slug = p.slug?.trim();
    if (!slug) continue;
    const base = programMap.get(slug);
    programMap.set(slug, base ? { ...base, ...p, slug } : p);
  }

  for (const program of programMap.values()) {
    const slug = program.slug?.trim();
    if (!slug) continue;
    const kind: GrantableOfferingKind = isWorkshopProgram(program) ? "workshop" : "tutor-led";
    // Prefer dedicated live programs over catalog rows with the same slug.
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
