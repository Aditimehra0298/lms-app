/** Current page origin — must match a Google OAuth "Authorized JavaScript origin". */
export function getBrowserOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

const LOCAL_DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
]);

export function isLanOrNonLocalhostOrigin(origin: string): boolean {
  const o = origin.trim().toLowerCase();
  if (!o) return false;
  return !LOCAL_DEV_ORIGINS.has(o);
}

export function googleOriginSetupHint(origin?: string): string {
  const o = (origin ?? getBrowserOrigin()).trim() || "http://localhost:3000";
  return `Add ${o} (and http://localhost:3000, http://127.0.0.1:3000 if needed) under Google Cloud Console → Credentials → OAuth client → Authorized JavaScript origins.`;
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
