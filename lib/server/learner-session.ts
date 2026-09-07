import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sharedAuthCookieDomain } from "@/lib/server/auth-cookie-domain";
import { isSameSiteOrigin } from "@/lib/server/csrf-origin";

/**
 * JWT-style learner session (HMAC-SHA256):
 *   base64url(JSON payload).base64url(signature)
 * Payload: { v, email, exp, csrf, xsrf }
 *
 * Z+ Coursera-style token stack:
 * 1) HttpOnly session cookie — identity
 * 2) CSRF cookie + X-CSRF-Token — primary double-submit
 * 3) XSRF cookie + X-XSRF-TOKEN — secondary double-submit
 * 4) Same-origin check on mutations
 */
export const LEARNER_SESSION_COOKIE = "sft_learner_session";
export const LEARNER_CSRF_COOKIE = "sft_learner_csrf";
export const LEARNER_XSRF_COOKIE = "sft_learner_xsrf";
export const LEARNER_CSRF_HEADER = "x-csrf-token";
export const LEARNER_XSRF_HEADER = "x-xsrf-token";

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type LearnerSessionClaims = {
  email: string;
  exp: number;
  csrf: string;
  xsrf: string;
};

function signingSecret(): string {
  const s =
    process.env.LEARNER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.MEDIA_SIGNING_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim();
  if (!s) {
    return process.env.DATABASE_URL?.trim() || "dev-only-learner-session-secret-change-me";
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

export function createLearnerCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createLearnerSessionToken(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  csrf: string = createLearnerCsrfToken(),
  xsrf: string = createLearnerCsrfToken(),
): { token: string; csrf: string; xsrf: string; exp: number } {
  const normalized = email.trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + Math.max(300, ttlSeconds);
  const payload = JSON.stringify({ v: 3, email: normalized, exp, csrf, xsrf });
  return { token: `${b64url(payload)}.${signPayload(payload)}`, csrf, xsrf, exp };
}

export function verifyLearnerSessionClaims(
  token: string | undefined | null,
): LearnerSessionClaims | null {
  if (!token?.trim()) return null;
  try {
    const raw = token.trim();
    const [payloadB64, sig] = raw.split(".");
    if (!payloadB64 || !sig) return null;
    const payloadJson = b64urlDecode(payloadB64);
    if (!safeEqual(sig, signPayload(payloadJson))) return null;
    const parsed = JSON.parse(payloadJson) as {
      email?: string;
      exp?: number;
      csrf?: string;
      xsrf?: string;
    };
    if (!parsed.email || !Number.isFinite(parsed.exp)) return null;
    if (Math.floor(Date.now() / 1000) > (parsed.exp as number)) return null;
    return {
      email: parsed.email.trim().toLowerCase(),
      exp: parsed.exp as number,
      csrf: typeof parsed.csrf === "string" ? parsed.csrf : "",
      xsrf: typeof parsed.xsrf === "string" ? parsed.xsrf : "",
    };
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  return appUrl.startsWith("https://") || process.env.NODE_ENV === "production";
}

function cookieBase(name: string, value: string, maxAge: number, httpOnly: boolean): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (httpOnly) parts.splice(2, 0, "HttpOnly");
  const domain = sharedAuthCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function learnerSessionCookieHeader(token: string): string {
  return cookieBase(LEARNER_SESSION_COOKIE, token, DEFAULT_TTL_SECONDS, true);
}

export function learnerCsrfCookieHeader(csrf: string): string {
  return cookieBase(LEARNER_CSRF_COOKIE, csrf, DEFAULT_TTL_SECONDS, false);
}

export function learnerXsrfCookieHeader(xsrf: string): string {
  return cookieBase(LEARNER_XSRF_COOKIE, xsrf, DEFAULT_TTL_SECONDS, false);
}

export function clearLearnerSessionCookieHeader(): string {
  return cookieBase(LEARNER_SESSION_COOKIE, "", 0, true);
}

export function clearLearnerCsrfCookieHeader(): string {
  return cookieBase(LEARNER_CSRF_COOKIE, "", 0, false);
}

export function clearLearnerXsrfCookieHeader(): string {
  return cookieBase(LEARNER_XSRF_COOKIE, "", 0, false);
}

export function readLearnerSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_SESSION_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

export function readLearnerCsrfCookie(request: Request): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_CSRF_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

export function readLearnerXsrfCookie(request: Request): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_XSRF_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

export function readLearnerSessionClaims(request: Request): LearnerSessionClaims | null {
  return verifyLearnerSessionClaims(readLearnerSessionCookie(request));
}

export function readLearnerSessionEmail(request: Request): string | null {
  return readLearnerSessionClaims(request)?.email ?? null;
}

export function requireLearnerSessionEmail(request: Request): string | null {
  return readLearnerSessionEmail(request);
}

/** Dual CSRF + XSRF double-submit + same-origin for learner mutations. */
export function assertLearnerCsrf(
  request: Request,
  claims: LearnerSessionClaims,
): string | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  if (!isSameSiteOrigin(request)) {
    return "Cross-site request blocked.";
  }
  if (!claims.csrf) {
    return "Session outdated. Sign in again.";
  }

  const csrfHeader = request.headers.get(LEARNER_CSRF_HEADER)?.trim() || "";
  const csrfCookie = readLearnerCsrfCookie(request)?.trim() || "";
  if (!csrfHeader || !csrfCookie) {
    return "Missing CSRF token. Refresh the page and try again.";
  }
  if (!safeEqual(csrfHeader, csrfCookie) || !safeEqual(csrfHeader, claims.csrf)) {
    return "Invalid CSRF token.";
  }

  if (claims.xsrf) {
    const xsrfHeader = request.headers.get(LEARNER_XSRF_HEADER)?.trim() || "";
    const xsrfCookie = readLearnerXsrfCookie(request)?.trim() || "";
    if (!xsrfHeader || !xsrfCookie) {
      return "Missing XSRF token. Refresh the page and try again.";
    }
    if (!safeEqual(xsrfHeader, xsrfCookie) || !safeEqual(xsrfHeader, claims.xsrf)) {
      return "Invalid XSRF token.";
    }
  }

  return null;
}

/**
 * Session + CSRF + XSRF for learner write APIs.
 * Returns email or a ready-to-return error response.
 */
export function requireLearnerMutationAuth(
  request: Request,
): { email: string } | { response: NextResponse } {
  const claims = readLearnerSessionClaims(request);
  if (!claims?.email) {
    return { response: learnerAuthRequiredResponse() };
  }
  const csrfError = assertLearnerCsrf(request, claims);
  if (csrfError) {
    return {
      response: NextResponse.json(
        { ok: false, message: csrfError },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return { email: claims.email };
}

export function attachLearnerSession(response: NextResponse, email: string): NextResponse {
  const { token, csrf, xsrf } = createLearnerSessionToken(email);
  response.headers.append("Set-Cookie", learnerSessionCookieHeader(token));
  response.headers.append("Set-Cookie", learnerCsrfCookieHeader(csrf));
  response.headers.append("Set-Cookie", learnerXsrfCookieHeader(xsrf));
  response.headers.set("X-Learner-CSRF", csrf);
  response.headers.set("X-Learner-XSRF", xsrf);
  return response;
}

export function clearLearnerSession(response: NextResponse): NextResponse {
  response.headers.append("Set-Cookie", clearLearnerSessionCookieHeader());
  response.headers.append("Set-Cookie", clearLearnerCsrfCookieHeader());
  response.headers.append("Set-Cookie", clearLearnerXsrfCookieHeader());
  return response;
}

export function learnerAuthRequiredResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "Sign in required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
