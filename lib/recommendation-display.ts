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
