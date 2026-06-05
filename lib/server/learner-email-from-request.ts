/** Learner email from ?email= query or sft_learner_email session cookie. */
export function learnerEmailFromRequest(request: Request): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (fromQuery) return fromQuery;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)sft_learner_email=([^;]*)/i);
  if (!match?.[1]) return "";

  try {
    return decodeURIComponent(match[1].trim()).toLowerCase();
  } catch {
    return match[1].trim().toLowerCase();
  }
}
