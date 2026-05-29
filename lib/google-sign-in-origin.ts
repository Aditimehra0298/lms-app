/** Current page origin — must match a Google OAuth "Authorized JavaScript origin". */
export function getBrowserOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function isLanOrNonLocalhostOrigin(origin: string): boolean {
  const o = origin.trim().toLowerCase();
  if (!o) return false;
  return o !== "http://localhost:3000" && o !== "https://localhost:3000";
}

export function googleOriginSetupHint(origin?: string): string {
  const o = (origin ?? getBrowserOrigin()).trim() || "http://localhost:3000";
  return `Add ${o} under Google Cloud Console → Credentials → your OAuth client → Authorized JavaScript origins (keep http://localhost:3000 too).`;
}

export function googleOriginMismatchHint(message: string, origin?: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("origin") ||
    lower.includes("blocked") ||
    lower.includes("redirect_uri") ||
    lower.includes("not allowed")
  ) {
    return `${message} ${googleOriginSetupHint(origin)}`;
  }
  return message;
}
