/** User-facing recommendation copy — never expose Google/YouTube/profile inference in UI. */

const INTERNAL_REASON =
  /google|youtube|interest|profile|aligned with|matches your|organization|work email|account suggests|subscription|liked video/i;

export function displayRecommendationReason(reason: string | undefined): string {
  const r = reason?.trim() ?? "";
  if (!r) return "Recommended from our catalog";
  if (r.toLowerCase().includes("continue")) return r;
  if (r.toLowerCase().includes("featured")) return "Featured on SF Trainings";
  if (INTERNAL_REASON.test(r)) return "Recommended from our catalog";
  if (/popular|catalog|expert-led|certification|compliance goals/i.test(r)) {
    return "Popular on SF Trainings";
  }
  return "Recommended for you";
}

export const RECOMMENDED_SECTION_TITLE = "Recommended courses";
export const RECOMMENDED_SECTION_SUBTITLE =
  "Top picks from the SF Trainings catalog — explore and enroll on our website.";

export const ORG_RECOMMENDED_SECTION_TITLE = "Recommended for your team";
export const ORG_RECOMMENDED_SECTION_SUBTITLE =
  "Top catalog picks based on your company profile — assign any course to invited employees.";

/** Org dashboard — show company-aware copy without exposing Google/YouTube inference. */
export function displayOrgRecommendationReason(
  reason: string | undefined,
  companyName?: string | null,
): string {
  const r = reason?.trim() ?? "";
  const company = companyName?.trim();
  if (!r) {
    return company ? `Recommended for ${company}` : "Recommended for your team";
  }
  if (r.toLowerCase().includes("continue")) return r;
  if (r.toLowerCase().includes("featured")) return "Featured on SF Trainings";
  if (company && /recommended for|top pick for|live training for|relevant for/i.test(r)) {
    if (r.includes(company)) return r;
    return `Recommended for ${company}`;
  }
  if (/team|organization|company/i.test(r) && company) {
    return `Recommended for ${company}`;
  }
  if (INTERNAL_REASON.test(r)) {
    return company ? `Matched to ${company}'s industry` : "Recommended for your team";
  }
  if (/popular|catalog|expert-led|certification|compliance|live expert/i.test(r)) {
    return company ? `Popular with ${company} teams` : "Popular on SF Trainings";
  }
  return company ? `Recommended for ${company}` : "Recommended for your team";
}
