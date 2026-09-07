/**
 * Shared same-origin checks for CSRF-protected mutations (Coursera-style defense-in-depth).
 */

function addWwwVariants(set: Set<string>, origin: string): void {
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

/** Public site origin(s), including www/apex and reverse-proxy Host. */
export function allowedRequestOrigins(request: Request): Set<string> {
  const set = new Set<string>();

  try {
    set.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }

  // Behind nginx/PM2, request.url is often http://127.0.0.1:3000 — use forwarded Host.
  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (xfHost || request.headers.get("host")?.trim() || "").replace(/:\d+$/, (m) =>
    m === ":443" || m === ":80" ? "" : m,
  );
  const xfProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host && !host.includes("localhost") ? "https" : "http");
  if (host) {
    set.add(`${xfProto}://${host}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      set.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }

  for (const origin of [...set]) {
    addWwwVariants(set, origin);
  }
  return set;
}

export function isSameSiteOrigin(request: Request): boolean {
  const allowed = allowedRequestOrigins(request);
  const origin = request.headers.get("origin")?.trim();
  if (origin) return allowed.has(origin);
  const referer = request.headers.get("referer")?.trim();
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
