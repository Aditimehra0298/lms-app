import { NextResponse } from "next/server";
import {
  OTP_EMAIL_VERIFY_WINDOW_MINUTES,
  OTP_IP_VERIFY_WINDOW_MINUTES,
  OTP_MAX_EMAIL_VERIFY_ATTEMPTS,
  OTP_MAX_IP_VERIFY_ATTEMPTS,
  OTP_MIN_VERIFY_GAP_MS,
} from "@/lib/email-otp";
import { verifyRegistrationOtp } from "@/lib/email-otp-service";
import { enforceMinGap, hitRateLimit } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";

export const dynamic = "force-dynamic";

type Body = { email?: string; code?: string };

function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterSec && retryAfterSec > 0) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return NextResponse.json({ ok: false, message }, { status, headers });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email) {
    return jsonError("Email is required", 400);
  }
  if (!code) {
    return jsonError("OTP code is required", 400);
  }

  const ip = getTrustedClientIp(request);

  const ipLimit = hitRateLimit(
    `otp-verify:ip:${ip}`,
    OTP_MAX_IP_VERIFY_ATTEMPTS,
    OTP_IP_VERIFY_WINDOW_MINUTES * 60 * 1000,
    "Too many verification attempts from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  const emailLimit = hitRateLimit(
    `otp-verify:email:${email}`,
    OTP_MAX_EMAIL_VERIFY_ATTEMPTS,
    OTP_EMAIL_VERIFY_WINDOW_MINUTES * 60 * 1000,
    "Too many verification attempts for this email. Request a new code later.",
  );
  if (!emailLimit.ok) {
    return jsonError(emailLimit.message, 429, emailLimit.retryAfterSec);
  }

  const gap = enforceMinGap(
    `otp-verify:gap:${email}`,
    OTP_MIN_VERIFY_GAP_MS,
    "Wait a moment before trying another code.",
  );
  if (!gap.ok) {
    return jsonError(gap.message, 429, gap.retryAfterSec);
  }

  try {
    const result = await verifyRegistrationOtp(email, code);
    if (!result.ok) {
      const status = result.httpStatus ?? 400;
      return NextResponse.json(
        { ok: false, message: result.message, remainingAttempts: result.remainingAttempts },
        {
          status,
          headers: {
            "Cache-Control": "no-store",
            ...(status === 429 ? { "Retry-After": "60" } : {}),
          },
        },
      );
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[otp/verify]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Verification failed. Restart after: npx prisma db push && npm run db:generate",
      },
      { status: 500 },
    );
  }
}
