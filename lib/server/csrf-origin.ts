/**
 * Shared same-origin checks for CSRF-protected mutations (Coursera-style defense-in-depth).
 */

export function allowedRequestOrigins(request: Request): Set<string> {
  const set = new Set<string>();
  try {
    set.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      set.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }
  // Accept both www and apex when APP_URL is one of them.
  for (const origin of [...set]) {
    try {
      const u = new URL(origin);
      if (u.hostname.startsWith("www.")) {
        set.add(`${u.protocol}//${u.hostname.slice(4)}`);
      } else if (u.hostname.includes(".")) {
        set.add(`${u.protocol}//www.${u.hostname}`);
      }
    } catch {
      /* ignore */
    }
  }
  return set;
}

export function isSameSiteOrigin(request: Request): boolean {
  const allowed = allowedRequestOrigins(request);
  const origin = request.headers.get("origin");
  if (origin) return allowed.has(origin);
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // Non-browser clients (curl/scripts) without Origin — treat as not same-site.
  return false;
}
