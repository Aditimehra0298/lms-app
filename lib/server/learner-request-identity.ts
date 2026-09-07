import {
  readLearnerSessionEmail,
  requireLearnerMutationAuth,
} from "@/lib/server/learner-session";

/** Display name from header is cosmetic only — never used for authorization. */
export function learnerDisplayNameFromRequest(request: Request, email: string): string {
  const name = request.headers.get("x-learner-name")?.trim();
  if (name) return name;
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || "Learner";
}

/**
 * Identity for reads: httpOnly learner session only.
 * Never trust x-learner-email / ?email= (VAPT IDOR).
 */
export function resolveLearnerViewer(request: Request): { email: string; name: string } | null {
  const email = readLearnerSessionEmail(request);
  if (!email) return null;
  return { email, name: learnerDisplayNameFromRequest(request, email) };
}

/**
 * Identity for learner write APIs: session + CSRF/XSRF + origin.
 */
export function requireLearnerWriter(
  request: Request,
): { email: string; name: string } | { response: Response } {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth;
  return { email: auth.email, name: learnerDisplayNameFromRequest(request, auth.email) };
}
