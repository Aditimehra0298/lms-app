import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * JWT-style learner session (HMAC-SHA256):
 *   base64url(JSON payload).base64url(signature)
 * Payload: { v, email, exp }
 *
 * HttpOnly cookie is the only trusted learner identity for private APIs.
 * Never trust ?email=, body.email, or the forgeable sft_learner_email cookie.
 */
export const LEARNER_SESSION_COOKIE = "sft_learner_session";

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type LearnerSessionClaims = {
  email: string;
  exp: number;
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

export function createLearnerSessionToken(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const normalized = email.trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + Math.max(300, ttlSeconds);
  const payload = JSON.stringify({ v: 1, email: normalized, exp });
  return `${b64url(payload)}.${signPayload(payload)}`;
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
    const parsed = JSON.parse(payloadJson) as { email?: string; exp?: number };
    if (!parsed.email || !Number.isFinite(parsed.exp)) return null;
    if (Math.floor(Date.now() / 1000) > (parsed.exp as number)) return null;
    return { email: parsed.email.trim().toLowerCase(), exp: parsed.exp as number };
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  return appUrl.startsWith("https://") || process.env.NODE_ENV === "production";
}

function cookieBase(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function learnerSessionCookieHeader(token: string): string {
  return cookieBase(LEARNER_SESSION_COOKIE, token, DEFAULT_TTL_SECONDS);
}

export function clearLearnerSessionCookieHeader(): string {
  return cookieBase(LEARNER_SESSION_COOKIE, "", 0);
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

export function readLearnerSessionEmail(request: Request): string | null {
  return verifyLearnerSessionClaims(readLearnerSessionCookie(request))?.email ?? null;
}

/**
 * Resolve authenticated learner email from the httpOnly session only.
 * Optional ?email= / body email may only match the session — never authorize alone.
 */
export function requireLearnerSessionEmail(request: Request): string | null {
  return readLearnerSessionEmail(request);
}

export function attachLearnerSession(response: NextResponse, email: string): NextResponse {
  response.headers.append(
    "Set-Cookie",
    learnerSessionCookieHeader(createLearnerSessionToken(email)),
  );
  return response;
}

export function clearLearnerSession(response: NextResponse): NextResponse {
  response.headers.append("Set-Cookie", clearLearnerSessionCookieHeader());
  return response;
}

export function learnerAuthRequiredResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "Sign in required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
