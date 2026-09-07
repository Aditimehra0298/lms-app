import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { requestPasswordResetEmail } from "@/lib/server/password-reset-service";
import { hitRateLimit, enforceMinGap } from "@/lib/server/otp-rate-limit";
import { getTrustedClientIp } from "@/lib/server/trusted-client-ip";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export const dynamic = "force-dynamic";

/**
 * Admin-triggered password reset email (same n8n webhook as Forgot password).
 * Requires verified admin session + CSRF (POC-C-08 / POC-D-13) — never trusts x-admin-email.
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let body: { email?: string; learnerName?: string };
  try {
    body = (await request.json()) as { email?: string; learnerName?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const targetEmail = normalizeLearnerEmail(body.email ?? "");
  if (!targetEmail) {
    return NextResponse.json({ ok: false, message: "Learner email is required." }, { status: 400 });
  }

  const ip = getTrustedClientIp(request);
  const ipLimit = hitRateLimit(
    `admin-pw-reset:ip:${ip}`,
    20,
    15 * 60 * 1000,
    "Too many admin password-reset emails from this network. Try again later.",
  );
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, message: ipLimit.message },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
    );
  }

  const targetLimit = hitRateLimit(
    `admin-pw-reset:target:${targetEmail}`,
    3,
    15 * 60 * 1000,
    "Too many reset emails for this learner recently. Wait before sending again.",
  );
  if (!targetLimit.ok) {
    return NextResponse.json(
      { ok: false, message: targetLimit.message },
      { status: 429, headers: { "Retry-After": String(targetLimit.retryAfterSec) } },
    );
  }

  const gap = enforceMinGap(
    `admin-pw-reset:gap:${targetEmail}`,
    30_000,
    "Wait 30 seconds before sending another reset email to this learner.",
  );
  if (!gap.ok) {
    return NextResponse.json(
      { ok: false, message: gap.message },
      { status: 429, headers: { "Retry-After": String(gap.retryAfterSec) } },
    );
  }

  try {
    const result = await requestPasswordResetEmail({
      email: targetEmail,
      learnerName: body.learnerName,
      requireExistingUser: true,
    });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.message?.includes("Too many")
          ? 429
          : result.message?.includes("No account")
            ? 404
            : 400,
      });
    }
    return NextResponse.json({
      ok: true,
      message: "Password reset email sent to the learner.",
    });
  } catch (err) {
    console.error("[admin/users/password-reset]", err);
    return NextResponse.json({ ok: false, message: "Could not send reset email." }, { status: 500 });
  }
}
