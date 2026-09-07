import { NextResponse } from "next/server";
import {
  OTP_IP_SEND_WINDOW_MINUTES,
  OTP_MAX_IP_SENDS,
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_SEND_WINDOW_MINUTES,
} from "@/lib/email-otp";
import { sendRegistrationOtp } from "@/lib/email-otp-service";
import { enforceMinGap, hitRateLimit } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";

export const dynamic = "force-dynamic";

type Body = { email?: string };

const OTP_MIN_SEND_GAP_MS = 60_000;

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
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Valid email is required", 400);
  }

  const ip = getTrustedClientIp(request);
  const ipLimit = hitRateLimit(
    `otp-send:ip:${ip}`,
    OTP_MAX_IP_SENDS,
    OTP_IP_SEND_WINDOW_MINUTES * 60 * 1000,
    "Too many code requests from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  const emailLimit = hitRateLimit(
    `otp-send:email:${email}`,
    OTP_MAX_SENDS_PER_WINDOW,
    OTP_SEND_WINDOW_MINUTES * 60 * 1000,
    "Too many code requests for this email. Try again later.",
  );
  if (!emailLimit.ok) {
    return jsonError(emailLimit.message, 429, emailLimit.retryAfterSec);
  }

  const gap = enforceMinGap(
    `otp-send:gap:${email}`,
    OTP_MIN_SEND_GAP_MS,
    "Please wait a minute before requesting another code.",
  );
  if (!gap.ok) {
    return jsonError(gap.message, 429, gap.retryAfterSec);
  }

  try {
    const result = await sendRegistrationOtp(email);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message ?? "Could not send code." },
        {
          status: result.message?.includes("Too many") ? 429 : 500,
          headers: {
            "Cache-Control": "no-store",
            ...(result.message?.includes("Too many") ? { "Retry-After": "900" } : {}),
          },
        },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        expiresInMinutes: result.expiresInMinutes,
        message: result.message,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[otp/send]", err);
    return NextResponse.json(
      { ok: false, message: "Could not send verification code. Please try again." },
      { status: 500 },
    );
  }
}
