import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "sft_admin_session";
const ADMIN_CSRF_COOKIE = "sft_admin_csrf";
const ADMIN_XSRF_COOKIE = "sft_admin_xsrf";
const ADMIN_CSRF_HEADER = "x-csrf-token";
const ADMIN_XSRF_HEADER = "x-xsrf-token";

function signingSecret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.MEDIA_SIGNING_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-only-admin-session-secret-change-me";
  return s;
}

function getMainAdminEmail(): string {
  const main = process.env.MAIN_ADMIN_EMAIL?.trim().toLowerCase();
  if (main) return main;
  const list = process.env.ADMIN_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list?.[0] ?? "";
}

function b64urlToBytes(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToB64url(buf);
}

type Claims = { email: string; csrf: string; xsrf: string };

async function verifyAdminSessionToken(token: string | null | undefined): Promise<Claims | null> {
  if (!token?.trim()) return null;
  try {
    const raw = token.trim();
    const main = getMainAdminEmail();
    if (!main) return null;

    if (raw.includes(".")) {
      const [payloadB64, sig] = raw.split(".");
      if (!payloadB64 || !sig) return null;
      const payloadJson = new TextDecoder().decode(b64urlToBytes(payloadB64));
      const expected = await hmacSign(payloadJson);
      if (!safeEqualStr(sig, expected)) return null;
      const parsed = JSON.parse(payloadJson) as {
        email?: string;
        exp?: number;
        csrf?: string;
        xsrf?: string;
      };
      if (!parsed.email || !parsed.csrf || !Number.isFinite(parsed.exp)) return null;
      if (Math.floor(Date.now() / 1000) > (parsed.exp as number)) return null;
      if (parsed.email.trim().toLowerCase() !== main) return null;
      return {
        email: parsed.email.trim().toLowerCase(),
        csrf: parsed.csrf,
        xsrf: typeof parsed.xsrf === "string" ? parsed.xsrf : "",
      };
    }

    const decoded = new TextDecoder().decode(b64urlToBytes(raw));
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!email || !sig || !Number.isFinite(exp)) return null;
    if (Math.floor(Date.now() / 1000) > exp) return null;
    if (email.trim().toLowerCase() !== main) return null;
    const payload = `${email}|${exp}`;
    const expected = await hmacSign(payload);
    if (!safeEqualStr(sig, expected)) return null;
    return { email: email.trim().toLowerCase(), csrf: "", xsrf: "" };
  } catch {
    return null;
  }
}

function allowedOrigins(request: NextRequest): Set<string> {
  const set = new Set<string>();
  set.add(request.nextUrl.origin);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      set.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }
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

function isSameOrigin(request: NextRequest): boolean {
  const allowed = allowedOrigins(request);
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
  return false;
}

function csrfOk(request: NextRequest, claims: Claims): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (!isSameOrigin(request)) return false;
  if (!claims.csrf) return true;

  const csrfHeader = request.headers.get(ADMIN_CSRF_HEADER)?.trim() || "";
  const csrfCookie = request.cookies.get(ADMIN_CSRF_COOKIE)?.value?.trim() || "";
  if (!csrfHeader || !csrfCookie) return false;
  if (!safeEqualStr(csrfHeader, csrfCookie) || !safeEqualStr(csrfHeader, claims.csrf)) return false;

  if (claims.xsrf) {
    const xsrfHeader = request.headers.get(ADMIN_XSRF_HEADER)?.trim() || "";
    const xsrfCookie = request.cookies.get(ADMIN_XSRF_COOKIE)?.value?.trim() || "";
    if (!xsrfHeader || !xsrfCookie) return false;
    if (!safeEqualStr(xsrfHeader, xsrfCookie) || !safeEqualStr(xsrfHeader, claims.xsrf)) return false;
  }
  return true;
}

/**
 * Protect private media paths, /admin UI, and /api/admin/* APIs.
 * Session + dual CSRF/XSRF + same-origin on mutations.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/uploads/admin/") || path.startsWith("/storage/private/")) {
    return NextResponse.json(
      { error: "Direct media access is disabled. Use authorized course playback." },
      { status: 403 },
    );
  }

  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin")) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null;
    const claims = await verifyAdminSessionToken(token);
    if (!claims) {
      if (path.startsWith("/api/admin")) {
        return NextResponse.json(
          { ok: false, message: "Admin access required. Sign in at /account?admin=1." },
          { status: 403 },
        );
      }
      const login = new URL("/account", request.url);
      login.searchParams.set("admin", "1");
      login.searchParams.set("redirect", path);
      return NextResponse.redirect(login);
    }

    if (path.startsWith("/api/admin") && !csrfOk(request, claims)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "CSRF check failed. Open /admin in this site, refresh, and retry. Cross-site admin calls are blocked.",
        },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/uploads/admin/:path*",
    "/storage/private/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
