import { NextResponse } from "next/server";
import {
  PASSWORD_RESET_IP_SEND_WINDOW_MINUTES,
  PASSWORD_RESET_MAX_IP_SENDS,
  PASSWORD_RESET_MAX_SENDS_PER_WINDOW,
  PASSWORD_RESET_MIN_SEND_GAP_MS,
  PASSWORD_RESET_SEND_WINDOW_MINUTES,
} from "@/lib/password-reset-token";
import { requestPasswordResetEmail } from "@/lib/server/password-reset-service";
import { enforceMinGap, hitRateLimit } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export const dynamic = "force-dynamic";

const GENERIC_OK =
  "If an account exists for this email, a password reset link has been sent. Check your inbox and spam.";

function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterSec && retryAfterSec > 0) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return NextResponse.json({ ok: false, message }, { status, headers });
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = normalizeLearnerEmail(body.email ?? "");
  const ip = getTrustedClientIp(request);

  const ipLimit = hitRateLimit(
    `pw-reset-send:ip:${ip}`,
    PASSWORD_RESET_MAX_IP_SENDS,
    PASSWORD_RESET_IP_SEND_WINDOW_MINUTES * 60 * 1000,
    "Too many reset emails from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return jsonError(ipLimit.message, 429, ipLimit.retryAfterSec);
  }

  if (email) {
    const emailLimit = hitRateLimit(
      `pw-reset-send:email:${email}`,
      PASSWORD_RESET_MAX_SENDS_PER_WINDOW,
      PASSWORD_RESET_SEND_WINDOW_MINUTES * 60 * 1000,
      "Too many reset emails for this address. Try again later.",
    );
    if (!emailLimit.ok) {
      return jsonError(emailLimit.message, 429, emailLimit.retryAfterSec);
    }

    const gap = enforceMinGap(
      `pw-reset-send:gap:${email}`,
      PASSWORD_RESET_MIN_SEND_GAP_MS,
      "Please wait a minute before requesting another reset email.",
    );
    if (!gap.ok) {
      return jsonError(gap.message, 429, gap.retryAfterSec);
    }
  }

  try {
    const result = await requestPasswordResetEmail({ email: body.email ?? "" });
    if (!result.ok) {
      const status = result.message?.toLowerCase().includes("too many") ? 429 : 400;
      return jsonError(result.message ?? "Could not send reset email.", status, status === 429 ? 60 : undefined);
    }
    // Always generic success — do not reveal whether the account exists.
    return NextResponse.json(
      {
        ok: true,
        message: result.message ?? GENERIC_OK,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[forgot-password/send]", err);
    return jsonError("Could not send reset email.", 500);
  }
}
