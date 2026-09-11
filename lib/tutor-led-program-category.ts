import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { ISO_22000_PROGRAM_SLUGS } from "@/lib/iso-22000-tutor-led-seed";

const ISO_SLUGS = new Set<string>(Object.values(ISO_22000_PROGRAM_SLUGS));

/** Resolve which Explore category a live program belongs to. */
export function tutorLedProgramCategory(program: TutorLedProgramStored): string {
  const explicit = canonicalCategorySlug((program.category ?? "").trim());
  if (explicit) return explicit;

  const blob = `${program.slug} ${program.title} ${program.subtitle}`.toLowerCase();
  if (ISO_SLUGS.has(program.slug) || /iso\s*22000|haccp|fssc|food safety|fsms/.test(blob)) {
    return "food-safety";
  }
  if (/cyber|ethical.?hack|penet/.test(blob)) return "cyber-security";
  if (/\besg\b|sustainab/.test(blob)) return "esg";
  if (/information security|iso\s*27001/.test(blob)) return "information-security";
  if (/medical device/.test(blob)) return "medical-devices";
  if (/workplace|compliance/.test(blob)) return "workplace-compliance";
  if (/hvac|refrigerat/.test(blob)) return "mechanical-engineering-hvac-and-refrigeration";
  return "";
}

export function tutorLedProgramMatchesCategory(
  program: TutorLedProgramStored,
  categorySlug: string,
): boolean {
  const want = canonicalCategorySlug(categorySlug);
  if (!want) return false;
  return tutorLedProgramCategory(program) === want;
}
