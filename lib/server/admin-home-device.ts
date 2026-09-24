import { createHmac, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import { cookieScopeFromRequest } from "@/lib/server/cookie-request-scope";

/** Long-lived mark that this browser is the owner PC (always allowed into Admin). */
export const ADMIN_HOME_DEVICE_COOKIE = "sft_admin_home_device";
const HOME_TTL_SECONDS = 180 * 24 * 60 * 60;

function signingSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-only-admin-session-secret-change-me"
  );
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function isPrivateOrLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "::ffff:127.0.0.1" ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  );
}

function ownerDeviceKey(): string {
  return process.env.ADMIN_OWNER_DEVICE_KEY?.trim() || "";
}

export function requestHasOwnerDeviceKey(provided?: string | null): boolean {
  const expected = ownerDeviceKey();
  const got = provided?.trim() || "";
  if (!expected || !got || expected.length !== got.length) return false;
  return safeEqual(got, expected);
}

/** IPs/hosts of the machine running this LMS — never public domains like sftlms.com. */
export function adminHomeHosts(): Set<string> {
  const set = new Set<string>(["127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1"]);
  const extra = process.env.ADMIN_OWNER_IPS?.split(",") ?? [];
  for (const part of extra) {
    const v = part.trim().toLowerCase();
    if (v && isPrivateOrLocalHost(v)) set.add(v);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname.toLowerCase();
      if (isPrivateOrLocalHost(host)) set.add(host);
    } catch {
      /* ignore */
    }
  }
  try {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const row of addrs ?? []) {
        if (row.address && isPrivateOrLocalHost(row.address.toLowerCase())) {
          set.add(row.address.toLowerCase());
        }
      }
    }
  } catch {
    /* ignore */
  }
  return set;
}

function requestHost(request: Request): string {
  const xf = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = (xf || request.headers.get("host") || "").split(":")[0]?.toLowerCase() ?? "";
  return host;
}

function readHomeCookie(request: Request): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${ADMIN_HOME_DEVICE_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function homeCookieValid(token: string | null): boolean {
  if (!token?.includes(".")) return false;
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const expected = createHmac("sha256", signingSecret()).update(payloadJson).digest("base64url");
    if (!safeEqual(sig, expected)) return false;
    const parsed = JSON.parse(payloadJson) as { home?: number; exp?: number };
    if (parsed.home !== 1 || !Number.isFinite(parsed.exp)) return false;
    return Math.floor(Date.now() / 1000) <= (parsed.exp as number);
  } catch {
    return false;
  }
}

/** True when this request is from the owner PC (local server or claimed live device). */
export function isAdminHomeDevice(request: Request, providedKey?: string | null): boolean {
  if (requestHasOwnerDeviceKey(providedKey)) return true;
  if (requestHasOwnerDeviceKey(request.headers.get("x-admin-home-key"))) return true;
  if (homeCookieValid(readHomeCookie(request))) return true;
  const ip = getTrustedClientIp(request).toLowerCase().replace(/^::ffff:/, "");
  const host = requestHost(request);
  const home = adminHomeHosts();
  if (home.has(ip)) return true;
  if (isPrivateOrLocalHost(host) && home.has(host)) return true;
  if (ip === "unknown" && (host === "localhost" || host === "127.0.0.1")) return true;
  return false;
}

export function adminHomeDeviceCookieHeader(request?: Request): string {
  const exp = Math.floor(Date.now() / 1000) + HOME_TTL_SECONDS;
  const payload = JSON.stringify({ v: 1, home: 1, exp });
  const token = `${b64url(payload)}.${createHmac("sha256", signingSecret()).update(payload).digest("base64url")}`;
  const scope = cookieScopeFromRequest(request);
  const parts = [
    `${ADMIN_HOME_DEVICE_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${HOME_TTL_SECONDS}`,
  ];
  if (scope.domain) parts.push(`Domain=${scope.domain}`);
  if (scope.secure) parts.push("Secure");
  return parts.join("; ");
}
