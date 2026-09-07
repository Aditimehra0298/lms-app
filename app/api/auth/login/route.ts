import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import { verifyPassword } from "@/lib/server/password-hash";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { getClientIps } from "@/lib/request-ip";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { attachLearnerSession } from "@/lib/server/learner-session";
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
const MAX_ATTEMPTS_PER_IP = 40;
const IP_WINDOW_MS = 15 * 60 * 1000;
const MIN_GAP_MS = 800;

function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterSec && retryAfterSec > 0) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return NextResponse.json({ ok: false, message }, { status, headers });
}

/** Email + password login for Individual / Organisation (not admin, not Google-only). */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const ip = getTrustedClientIp(request);

  const ipLimit = hitRateLimit(
    `login:ip:${ip}`,
    MAX_ATTEMPTS_PER_IP,
    IP_WINDOW_MS,
    "Too many sign-in attempts from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  if (!email || !password) {
    return jsonError("Email and password are required.", 400);
  }

  if (isMainAdminEmail(email)) {
    return jsonError("Use the Admin profile to sign in as administrator.", 403);
  }

  const failKey = `login:fail:${email}`;
  const lock = getRateLimitStatus(failKey, MAX_FAILS_PER_ACCOUNT);
  if (lock.limited) {
    return jsonError(
      "Too many incorrect sign-in attempts. Wait 15 minutes and try again.",
      429,
      lock.retryAfterSec,
    );
  }

  const gap = enforceMinGap(
    `login:gap:${email}`,
    MIN_GAP_MS,
    "Wait a moment before trying again.",
  );
  if (!gap.ok) {
    return jsonError(gap.message, 429, gap.retryAfterSec);
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { passwordHash: true, accountType: true, countryCode: true },
  });

  if (!user) {
    hitRateLimit(
      failKey,
      MAX_FAILS_PER_ACCOUNT,
      ACCOUNT_WINDOW_MS,
      "Too many incorrect sign-in attempts. Wait 15 minutes and try again.",
    );
    return jsonError("Invalid email or password.", 401);
  }

  if (!user.passwordHash) {
    return jsonError(
      "No password on this account. Sign in with Google or use Forgot password to set a new password.",
      401,
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const fail = hitRateLimit(
      failKey,
      MAX_FAILS_PER_ACCOUNT,
      ACCOUNT_WINDOW_MS,
      "Too many incorrect sign-in attempts. Wait 15 minutes and try again.",
    );
    if (!fail.ok) {
      return jsonError(fail.message, 429, fail.retryAfterSec);
    }
    return jsonError("Invalid email or password.", 401);
  }

  clearRateLimitKey(failKey);
  clearRateLimitKey(`login:gap:${email}`);

  const ips = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ips);
  const storedIps = ipsForStorage(ips, geo);
  await prisma.lmsUser.update({
    where: { email },
    data: {
      lastLoginAt: new Date(),
      ipv4: storedIps.ipv4 ?? undefined,
      ipv6: storedIps.ipv6 ?? undefined,
      ...(!user.countryCode
        ? {
            countryCode: geo.countryCode,
            countryName: geo.countryName,
          }
        : {}),
    },
  });

  const profile = await fetchLmsUserProfile(email);
  const res = NextResponse.json({ ok: true, profile });
  return attachLearnerSession(res, email);
}
