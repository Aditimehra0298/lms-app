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

export function isLocalHostname(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local") ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(h)
  );
}

function addLocalDevAliases(set: Set<string>, port: string): void {
  const suffix = port && port !== "80" && port !== "443" ? `:${port}` : "";
  for (const host of ["localhost", "127.0.0.1", "0.0.0.0"]) {
    set.add(`http://${host}${suffix}`);
  }
}

function requestPort(request: Request, hostHeader: string): string {
  const fromHost = hostHeader.split(":")[1] ?? "";
  if (fromHost) return fromHost;
  try {
    return new URL(request.url).port || "3000";
  } catch {
    return "3000";
  }
}

/** Public / browser origin to show in errors — never 0.0.0.0. */
export function browserFacingOrigin(request: Request): string {
  const origin = request.headers.get("origin")?.trim();
  if (origin && !origin.includes("0.0.0.0")) return origin.replace(/\/$/, "");
  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      const u = new URL(referer);
      if (u.hostname !== "0.0.0.0") return u.origin;
    } catch {
      /* ignore */
    }
  }
  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || request.headers.get("host")?.trim() || "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (host && hostname !== "0.0.0.0") {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (isLocalHostname(hostname) ? "http" : "https");
    return `${proto}://${host}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (u.hostname !== "0.0.0.0") return u.origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}

/** Public site origin(s), including www/apex and reverse-proxy Host. */
export function allowedRequestOrigins(request: Request): Set<string> {
  const set = new Set<string>();

  try {
    const raw = new URL(request.url);
    if (raw.hostname !== "0.0.0.0") set.add(raw.origin);
    if (isLocalHostname(raw.hostname)) addLocalDevAliases(set, raw.port || "3000");
  } catch {
    /* ignore */
  }

  // Behind nginx/PM2, request.url is often http://127.0.0.1:3000 — use forwarded Host.
  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = (xfHost || request.headers.get("host")?.trim() || "").replace(/:\d+$/, (m) =>
    m === ":443" || m === ":80" ? "" : m,
  );
  const hostname = rawHost.split(":")[0]?.toLowerCase() ?? "";
  const xfProtoHeader = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfProto = xfProtoHeader || (isLocalHostname(hostname) ? "http" : "https");
  if (rawHost && hostname !== "0.0.0.0") {
    set.add(`${xfProto}://${rawHost}`);
    if (!rawHost.includes(":") && request.headers.get("host")?.includes(":")) {
      set.add(`${xfProto}://${request.headers.get("host")!.trim()}`);
    }
  }
  if (isLocalHostname(hostname) || hostname === "0.0.0.0") {
    addLocalDevAliases(set, requestPort(request, rawHost));
  }

  const browserOrigin = request.headers.get("origin")?.trim();
  if (browserOrigin) {
    try {
      const o = new URL(browserOrigin);
      if (isLocalHostname(o.hostname)) {
        set.add(o.origin);
        addLocalDevAliases(set, o.port || requestPort(request, rawHost));
      }
    } catch {
      /* ignore */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (u.hostname !== "0.0.0.0") set.add(u.origin);
      if (isLocalHostname(u.hostname)) addLocalDevAliases(set, u.port || "3000");
    } catch {
      /* ignore */
    }
  }

  // Extra allow-list for reverse proxies / Cloudflare when Host is internal.
  const extra = process.env.ADMIN_ALLOWED_ORIGINS?.trim() || process.env.ALLOWED_ORIGINS?.trim() || "";
  for (const part of extra.split(",")) {
    const raw = part.trim();
    if (!raw) continue;
    try {
      set.add(new URL(raw).origin);
    } catch {
      /* ignore */
    }
  }

  // Live site — PM2 binds 0.0.0.0:3000 so request.url is not sftlms.com.
  set.add("https://sftlms.com");
  set.add("https://www.sftlms.com");

  if (browserOrigin) {
    try {
      const o = new URL(browserOrigin);
      if (o.hostname === "sftlms.com" || o.hostname === "www.sftlms.com") {
        set.add(o.origin);
      }
    } catch {
      /* ignore */
    }
  }

  for (const origin of [...set]) {
    addWwwVariants(set, origin);
  }
  return set;
}

function originHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isSameSiteOrigin(request: Request): boolean {
  const allowed = allowedRequestOrigins(request);
  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    if (allowed.has(origin)) return true;
    const originHostname = originHost(origin);
    if (originHostname === "sftlms.com" || originHostname === "www.sftlms.com") return true;
    // `next start -H 0.0.0.0` / `next dev --hostname 0.0.0.0` makes request.url
    // 0.0.0.0 while the browser is on localhost, a LAN IP, or the public site.
    const reqUrlHost = originHost(request.url);
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
      .split(":")[0]
      ?.toLowerCase();
    return isLocalHostname(originHostname) && (isLocalHostname(reqUrlHost) || isLocalHostname(host));
  }
  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return true;
      const reqUrlHost = originHost(request.url);
      const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
        .split(":")[0]
        ?.toLowerCase();
      return isLocalHostname(originHost(refOrigin)) && (isLocalHostname(reqUrlHost) || isLocalHostname(host));
    } catch {
      return false;
    }
  }
  return false;
}
