import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import {
  clearActiveAdminSession,
  isAdminSessionSidActive,
  isAdminSessionSidActiveSync,
  writeActiveAdminSession,
} from "@/lib/server/admin-active-session";
import { cookieScopeFromRequest, type CookieRequestScope } from "@/lib/server/cookie-request-scope";
import { isSameSiteOrigin } from "@/lib/server/csrf-origin";
import { adminHomeDeviceCookieHeader, isAdminHomeDevice } from "@/lib/server/admin-home-device";

/**
 * JWT-style admin session (HMAC-SHA256):
 *   base64url(JSON payload).base64url(signature)
 * Payload: { v, email, exp, csrf, xsrf, sid }
 *
 * Coursera-style multi-token stack:
 * 1) HttpOnly session cookie — identity + sid (exclusive device)
 * 2) CSRF cookie + X-CSRF-Token — primary double-submit
 * 3) XSRF cookie + X-XSRF-TOKEN — secondary double-submit
 * 4) Same-origin / Referer check (middleware + assertAdminCsrf)
 */
export const ADMIN_SESSION_COOKIE = "sft_admin_session";
export const ADMIN_CSRF_COOKIE = "sft_admin_csrf";
export const ADMIN_XSRF_COOKIE = "sft_admin_xsrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";
export const ADMIN_XSRF_HEADER = "x-xsrf-token";

/** Default session lifetime: 12 hours. */
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

export type AdminSessionClaims = {
  email: string;
  exp: number;
  csrf: string;
  xsrf: string;
  /** Exclusive session id — must match data/admin-active-session.json */
  sid: string;
};

function signingSecret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.MEDIA_SIGNING_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim();
  if (!s || s === "change-admin-session-secret") {
    return process.env.DATABASE_URL?.trim() || "dev-only-admin-session-secret-change-me";
  }
  return s;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function signPayload(payloadJson: string): string {
  return createHmac("sha256", signingSecret()).update(payloadJson).digest("base64url");
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createAdminSessionId(): string {
  return randomBytes(24).toString("base64url");
}

/** Create a signed JWT-style admin session token. */
export function createAdminSessionToken(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  csrf: string = createCsrfToken(),
  xsrf: string = createCsrfToken(),
  sid: string = createAdminSessionId(),
): { token: string; csrf: string; xsrf: string; exp: number; sid: string } {
  const normalized = email.trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + Math.max(300, ttlSeconds);
  const payload = JSON.stringify({
    v: 3,
    email: normalized,
    exp,
    csrf,
    xsrf,
    sid,
  });
  const token = `${b64url(payload)}.${signPayload(payload)}`;
  return { token, csrf, xsrf, exp, sid };
}

/**
 * Verify JWT-style token (and legacy email|exp|sig tokens during transition).
 * Returns claims or null. Does NOT check exclusive sid registry (async) — use
 * `verifyAdminSessionClaimsActive` for full checks.
 */
export function verifyAdminSessionClaims(
  token: string | undefined | null,
): AdminSessionClaims | null {
  if (!token?.trim()) return null;
  try {
    const raw = token.trim();

    // New JWT-style: payload.sig
    if (raw.includes(".")) {
      const [payloadB64, sig] = raw.split(".");
      if (!payloadB64 || !sig) return null;
      const payloadJson = b64urlDecode(payloadB64);
      const expected = signPayload(payloadJson);
      if (!safeEqual(sig, expected)) return null;
      const parsed = JSON.parse(payloadJson) as {
        v?: number;
        email?: string;
        exp?: number;
        csrf?: string;
        xsrf?: string;
        sid?: string;
      };
      if (!parsed.email || !parsed.csrf || !Number.isFinite(parsed.exp)) return null;
      if (Math.floor(Date.now() / 1000) > (parsed.exp as number)) return null;
      if (!isMainAdminEmail(parsed.email)) return null;
      return {
        email: parsed.email.trim().toLowerCase(),
        exp: parsed.exp as number,
        csrf: parsed.csrf,
        xsrf: typeof parsed.xsrf === "string" ? parsed.xsrf : "",
        sid: typeof parsed.sid === "string" ? parsed.sid : "",
      };
    }

    // Legacy: base64url(email|exp|sig)
    const decoded = b64urlDecode(raw);
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!email || !sig || !Number.isFinite(exp)) return null;
    if (Math.floor(Date.now() / 1000) > exp) return null;
    if (!isMainAdminEmail(email)) return null;
    const payload = `${email}|${exp}`;
    const expected = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
    if (!safeEqual(sig, expected)) return null;
    return {
      email: email.trim().toLowerCase(),
      exp,
      csrf: "",
      xsrf: "",
      sid: "",
    };
  } catch {
    return null;
  }
}

/** Verify token + exclusive active-session registry. */
export async function verifyAdminSessionClaimsActive(
  token: string | undefined | null,
): Promise<AdminSessionClaims | null> {
  const claims = verifyAdminSessionClaims(token);
  if (!claims) return null;
  if (!claims.sid) return null;
  const ok = await isAdminSessionSidActive(claims.email, claims.sid);
  return ok ? claims : null;
}

/** Verify token; returns email if valid main-admin session. */
export function verifyAdminSessionToken(token: string | undefined | null): string | null {
  return verifyAdminSessionClaims(token)?.email ?? null;
}

function cookieBase(
  name: string,
  value: string,
  maxAge: number,
  httpOnly: boolean,
  scope: CookieRequestScope,
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (httpOnly) parts.splice(2, 0, "HttpOnly");
  if (scope.domain) parts.push(`Domain=${scope.domain}`);
  if (scope.secure) parts.push("Secure");
  return parts.join("; ");
}

function scopeKey(scope: CookieRequestScope): string {
  return `${scope.domain ?? "host"}:${scope.secure ? "s" : "i"}`;
}

/** Host-only + Domain leftovers (sftlms.com) so a second PC/login cannot keep a stale CSRF cookie. */
export function adminCookieClearScopes(request?: Request): CookieRequestScope[] {
  const scopes: CookieRequestScope[] = [
    cookieScopeFromRequest(request),
    { domain: undefined, secure: false },
    { domain: undefined, secure: true },
    { domain: ".sftlms.com", secure: true },
    { domain: ".sftlms.com", secure: false },
  ];
  const seen = new Set<string>();
  return scopes.filter((s) => {
    const key = scopeKey(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function appendCookieHeaders(
  response: NextResponse,
  headers: string[],
): void {
  for (const header of headers) {
    response.headers.append("Set-Cookie", header);
  }
}

export function adminSessionCookieHeader(token: string, request?: Request): string {
  return cookieBase(ADMIN_SESSION_COOKIE, token, DEFAULT_TTL_SECONDS, true, cookieScopeFromRequest(request));
}

export function adminCsrfCookieHeader(csrf: string, request?: Request): string {
  return cookieBase(ADMIN_CSRF_COOKIE, csrf, DEFAULT_TTL_SECONDS, false, cookieScopeFromRequest(request));
}

export function adminXsrfCookieHeader(xsrf: string, request?: Request): string {
  return cookieBase(ADMIN_XSRF_COOKIE, xsrf, DEFAULT_TTL_SECONDS, false, cookieScopeFromRequest(request));
}

export function clearAdminSessionCookieHeader(request?: Request): string {
  return cookieBase(ADMIN_SESSION_COOKIE, "", 0, true, cookieScopeFromRequest(request));
}

export function clearAdminCsrfCookieHeader(request?: Request): string {
  return cookieBase(ADMIN_CSRF_COOKIE, "", 0, false, cookieScopeFromRequest(request));
}

export function clearAdminXsrfCookieHeader(request?: Request): string {
  return cookieBase(ADMIN_XSRF_COOKIE, "", 0, false, cookieScopeFromRequest(request));
}

export function clearAdminAuthCookieHeaders(request?: Request): string[] {
  const headers: string[] = [];
  for (const scope of adminCookieClearScopes(request)) {
    headers.push(cookieBase(ADMIN_SESSION_COOKIE, "", 0, true, scope));
    headers.push(cookieBase(ADMIN_CSRF_COOKIE, "", 0, false, scope));
    headers.push(cookieBase(ADMIN_XSRF_COOKIE, "", 0, false, scope));
  }
  return headers;
}

export function appendClearedAdminAuthCookies(response: NextResponse, request?: Request): void {
  appendCookieHeaders(response, clearAdminAuthCookieHeaders(request));
}

export function readAdminSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function readNamedCookies(header: string, name: string): string[] {
  const values: string[] = [];
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(header))) {
    const raw = match[1]?.trim() ?? "";
    if (!raw) continue;
    try {
      values.push(decodeURIComponent(raw));
    } catch {
      values.push(raw);
    }
  }
  return values;
}

export function readAdminCsrfCookie(request: Request): string | null {
  const values = readNamedCookies(request.headers.get("cookie") || "", ADMIN_CSRF_COOKIE);
  return values[values.length - 1] ?? null;
}

export function readAdminXsrfCookie(request: Request): string | null {
  const values = readNamedCookies(request.headers.get("cookie") || "", ADMIN_XSRF_COOKIE);
  return values[values.length - 1] ?? null;
}

function anyNamedCookieEquals(request: Request, name: string, expected: string): boolean {
  if (!expected) return false;
  return readNamedCookies(request.headers.get("cookie") || "", name).some((value) =>
    safeEqual(value, expected),
  );
}

export function readAdminSessionClaims(request: Request): AdminSessionClaims | null {
  return verifyAdminSessionClaims(readAdminSessionCookie(request));
}

export async function readAdminSessionClaimsActive(
  request: Request,
): Promise<AdminSessionClaims | null> {
  return verifyAdminSessionClaimsActive(readAdminSessionCookie(request));
}

export function readAdminSessionEmail(request: Request): string | null {
  const claims = readAdminSessionClaims(request);
  if (!claims?.email || !claims.sid) return null;
  if (!isAdminSessionSidActiveSync(claims.email, claims.sid)) return null;
  return claims.email;
}

export async function readAdminSessionEmailActive(request: Request): Promise<string | null> {
  return (await readAdminSessionClaimsActive(request))?.email ?? null;
}

export function assertAdminCsrf(request: Request, claims: AdminSessionClaims): string | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  if (!isSameSiteOrigin(request)) {
    return "Cross-site admin request blocked.";
  }

  // Legacy sessions without csrf: require same-origin only (checked above).
  if (!claims.csrf) return null;

  const csrfHeader = request.headers.get(ADMIN_CSRF_HEADER)?.trim() || "";
  if (!csrfHeader) {
    return "Missing CSRF token. Refresh /admin and sign in again on this computer.";
  }
  if (
    !safeEqual(csrfHeader, claims.csrf) ||
    !anyNamedCookieEquals(request, ADMIN_CSRF_COOKIE, claims.csrf)
  ) {
    return "Invalid CSRF token. Hard-refresh /admin. If you signed in on another computer, sign in again here.";
  }

  // Second token (XSRF) when present on the session — Coursera-style dual submit.
  if (claims.xsrf) {
    const xsrfHeader = request.headers.get(ADMIN_XSRF_HEADER)?.trim() || "";
    if (!xsrfHeader) {
      return "Missing XSRF token. Refresh /admin and sign in again on this computer.";
    }
    if (
      !safeEqual(xsrfHeader, claims.xsrf) ||
      !anyNamedCookieEquals(request, ADMIN_XSRF_COOKIE, claims.xsrf)
    ) {
      return "Invalid XSRF token. Hard-refresh /admin. If you signed in on another computer, sign in again here.";
    }
  }

  return null;
}

export async function attachAdminSession(
  response: NextResponse,
  email: string,
  request?: Request,
  opts?: { treatAsHome?: boolean; homeKey?: string | null },
): Promise<NextResponse> {
  const { token, csrf, xsrf, exp, sid } = createAdminSessionToken(email);
  await writeActiveAdminSession({
    email: email.trim().toLowerCase(),
    sid,
    createdAt: Math.floor(Date.now() / 1000),
    exp,
  });
  appendClearedAdminAuthCookies(response, request);
  response.headers.append("Set-Cookie", adminSessionCookieHeader(token, request));
  response.headers.append("Set-Cookie", adminCsrfCookieHeader(csrf, request));
  response.headers.append("Set-Cookie", adminXsrfCookieHeader(xsrf, request));
  const home =
    opts?.treatAsHome === true ||
    (request ? isAdminHomeDevice(request, opts?.homeKey) : false);
  if (home && request) {
    response.headers.append("Set-Cookie", adminHomeDeviceCookieHeader(request));
  }
  response.headers.set("X-Admin-CSRF", csrf);
  response.headers.set("X-Admin-XSRF", xsrf);
  return response;
}

export async function clearAdminSession(
  response: NextResponse,
  request?: Request,
): Promise<NextResponse> {
  const claims = request ? readAdminSessionClaims(request) : null;
  if (claims?.sid) {
    await clearActiveAdminSession(claims.sid);
  } else {
    await clearActiveAdminSession();
  }
  appendClearedAdminAuthCookies(response, request);
  return response;
}
