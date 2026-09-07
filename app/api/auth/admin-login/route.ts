import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured, verifyAdminPanelPassword } from "@/lib/server/admin-password";
import { createAdminVerifyToken } from "@/lib/server/admin-verify-token";
import { attachAdminSession, readAdminSessionClaims } from "@/lib/server/admin-session";
import {
  clearActiveAdminSession,
  isAdminSessionHeldElsewhere,
} from "@/lib/server/admin-active-session";
import { readAdminPanelSettings } from "@/lib/server/admin-panel-settings";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { getClientIps } from "@/lib/request-ip";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import {
  clearRateLimitKey,
  enforceMinGap,
  getRateLimitStatus,
  hitRateLimit,
} from "@/lib/server/otp-rate-limit";

export const dynamic = "force-dynamic";

const MAX_FAILS_PER_ACCOUNT = 5;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 30;
const IP_WINDOW_MS = 15 * 60 * 1000;
const MIN_GAP_MS = 1000;

function jsonError(
  message: string,
  status: number,
  retryAfterSec?: number,
  extra?: Record<string, unknown>,
) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterSec && retryAfterSec > 0) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return NextResponse.json({ ok: false, message, ...extra }, { status, headers });
}

/** Step 1 of admin login: verify email + password (when required). Step 2 may be Google. */
export async function POST(request: Request) {
  const settings = await readAdminPanelSettings();
  const passwordConfigured = await isAdminPasswordConfigured();

  if (settings.requirePanelPassword && !passwordConfigured) {
    return jsonError(
      "Admin password is not set yet. Contact your platform owner to set the first password.",
      503,
    );
  }

  let body: { email?: string; password?: string; forceTakeover?: boolean };
  try {
    body = (await request.json()) as {
      email?: string;
      password?: string;
      forceTakeover?: boolean;
    };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const forceTakeover = body.forceTakeover === true;
  const ip = getTrustedClientIp(request);

  const ipLimit = hitRateLimit(
    `admin-login:ip:${ip}`,
    MAX_ATTEMPTS_PER_IP,
    IP_WINDOW_MS,
    "Too many admin sign-in attempts from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    console.warn("[auth/admin-login] IP rate limit", { ip });
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  if (!email) {
    return jsonError("Email is required.", 400);
  }

  if (!isMainAdminEmail(email)) {
    hitRateLimit(
      `admin-login:probe:${ip}`,
      MAX_FAILS_PER_ACCOUNT,
      ACCOUNT_WINDOW_MS,
      "Too many attempts.",
    );
    return jsonError("Only the configured main administrator can sign in here.", 403);
  }

  const failKey = `admin-login:fail:${email}`;
  const lock = getRateLimitStatus(failKey, MAX_FAILS_PER_ACCOUNT);
  if (lock.limited) {
    console.warn("[auth/admin-login] account lockout", { email, ip });
    return jsonError(
      "Too many incorrect admin password attempts. Wait 15 minutes and try again.",
      429,
      lock.retryAfterSec,
    );
  }

  const gap = enforceMinGap(
    `admin-login:gap:${email}`,
    MIN_GAP_MS,
    "Wait a moment before trying again.",
  );
  if (!gap.ok) {
    return jsonError(gap.message, 429, gap.retryAfterSec);
  }

  if (settings.requirePanelPassword) {
    if (!password) {
      return jsonError("Password is required.", 400);
    }
    const ok = await verifyAdminPanelPassword(password);
    if (!ok) {
      const fail = hitRateLimit(
        failKey,
        MAX_FAILS_PER_ACCOUNT,
        ACCOUNT_WINDOW_MS,
        "Too many incorrect admin password attempts. Wait 15 minutes and try again.",
      );
      console.warn("[auth/admin-login] bad password", {
        email,
        ip,
        remaining: fail.ok ? fail.remaining : 0,
      });
      if (!fail.ok) {
        return jsonError(fail.message, 429, fail.retryAfterSec);
      }
      return jsonError(
        fail.remaining > 0
          ? `Incorrect admin password. ${fail.remaining} attempt${fail.remaining === 1 ? "" : "s"} remaining before temporary lockout.`
          : "Incorrect admin password. Too many failures — account temporarily locked.",
        401,
      );
    }
  }

  clearRateLimitKey(failKey);
  clearRateLimitKey(`admin-login:gap:${email}`);

  const currentClaims = readAdminSessionClaims(request);
  const held = await isAdminSessionHeldElsewhere(currentClaims?.sid);
  if (held.held) {
    if (!forceTakeover) {
      return jsonError(
        "Admin panel is already signed in on another device. Sign out there, or use “Continue on this device” below to end that session.",
        409,
        undefined,
        { sessionActiveElsewhere: true, canForceTakeover: true },
      );
    }
    // Password already verified — end the other device session and continue here.
    await clearActiveAdminSession();
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );
  const requiresGoogle = settings.requireGoogleVerification && googleConfigured;

  if (!requiresGoogle) {
    const ips = getClientIps(request);
    try {
      await prisma.lmsUser.upsert({
        where: { email },
        create: {
          email,
          role: "admin",
          accountType: "self",
          ipv4: ips.ipv4,
          ipv6: ips.ipv6,
          lastLoginAt: new Date(),
          emailVerifiedAt: new Date(),
        },
        update: {
          role: "admin",
          accountType: "self",
          ipv4: ips.ipv4 ?? undefined,
          ipv6: ips.ipv6 ?? undefined,
          lastLoginAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[auth/admin-login] profile upsert", err);
    }
    const profile = await fetchLmsUserProfile(email);
    const res = NextResponse.json({
      ok: true,
      requiresGoogleVerification: false,
      email,
      role: "admin",
      accountType: "self",
      profile,
    });
    return attachAdminSession(res, email);
  }

  const verifyToken = createAdminVerifyToken(email);

  return NextResponse.json({
    ok: true,
    requiresGoogleVerification: true,
    email,
    verifyToken,
  });
}
