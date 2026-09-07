import { NextResponse } from "next/server";
import { validateLearnerPassword } from "@/lib/password-policy";
import {
  PASSWORD_RESET_EMAIL_RESET_WINDOW_MINUTES,
  PASSWORD_RESET_IP_RESET_WINDOW_MINUTES,
  PASSWORD_RESET_MAX_EMAIL_RESET_FAILURES,
  PASSWORD_RESET_MAX_IP_RESETS,
  PASSWORD_RESET_MIN_RESET_GAP_MS,
} from "@/lib/password-reset-token";
import { consumePasswordResetToken } from "@/lib/server/password-reset-service";
import { hashPassword } from "@/lib/server/password-hash";
import { clearRateLimitKey, enforceMinGap, hitRateLimit } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterSec && retryAfterSec > 0) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return NextResponse.json({ ok: false, message }, { status, headers });
}

/**
 * Password reset — high-entropy email link token only (POC-D-02).
 * 6-digit code resets are disabled; they were brute-forceable without lockout.
 */
export async function POST(request: Request) {
  let body: { email?: string; code?: string; token?: string; password?: string };
  try {
    body = (await request.json()) as {
      email?: string;
      code?: string;
      token?: string;
      password?: string;
    };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  // Explicitly reject legacy 6-digit code takeover path.
  if (body.code?.trim() && !body.token?.trim()) {
    return jsonError(
      "Password reset codes are no longer supported. Use the link from your reset email.",
      400,
    );
  }

  const password = body.password ?? "";
  const policy = validateLearnerPassword(password);
  if (!policy.ok) {
    return jsonError(policy.message, 400);
  }

  const token = body.token?.trim() ?? "";
  if (!token) {
    return jsonError("Reset link token is required. Open the link from your email.", 400);
  }

  const ip = getTrustedClientIp(request);
  const emailHint = body.email?.trim().toLowerCase() || "unknown";

  const ipLimit = hitRateLimit(
    `pw-reset:ip:${ip}`,
    PASSWORD_RESET_MAX_IP_RESETS,
    PASSWORD_RESET_IP_RESET_WINDOW_MINUTES * 60 * 1000,
    "Too many password reset attempts from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  const gap = enforceMinGap(
    `pw-reset:gap:${ip}`,
    PASSWORD_RESET_MIN_RESET_GAP_MS,
    "Wait a moment before trying again.",
  );
  if (!gap.ok) {
    return jsonError(gap.message, 429, gap.retryAfterSec);
  }

  const consumed = await consumePasswordResetToken({ token });
  if (!consumed.ok || !consumed.email) {
    const failLimit = hitRateLimit(
      `pw-reset:fail:${emailHint}`,
      PASSWORD_RESET_MAX_EMAIL_RESET_FAILURES,
      PASSWORD_RESET_EMAIL_RESET_WINDOW_MINUTES * 60 * 1000,
      "Too many failed reset attempts. Request a new reset email later.",
    );
    if (!failLimit.ok) {
      return jsonError(failLimit.message, 429, failLimit.retryAfterSec);
    }
    return jsonError(consumed.message ?? "Invalid or expired reset link.", 400);
  }

  const email = consumed.email;
  clearRateLimitKey(`pw-reset:fail:${email}`);
  clearRateLimitKey(`pw-reset:fail:unknown`);

  const user = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return jsonError("No account found for this email.", 404);
  }

  const passwordHash = await hashPassword(password);
  await prisma.lmsUser.update({
    where: { email },
    data: { passwordHash },
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
