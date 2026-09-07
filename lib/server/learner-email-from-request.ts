/**
 * Learner email for private APIs — httpOnly session only.
 * Do NOT use ?email= or the forgeable sft_learner_email cookie (POC-C-04).
 */
import { readLearnerSessionEmail } from "@/lib/server/learner-session";

export function learnerEmailFromRequest(request: Request): string {
  return readLearnerSessionEmail(request) ?? "";
}
