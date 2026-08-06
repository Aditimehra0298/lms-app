import { NextResponse } from "next/server";
import { verifyOtpForPurpose } from "@/lib/email-otp-service";
import { validateLearnerPassword } from "@/lib/password-policy";
import { consumePasswordResetToken } from "@/lib/server/password-reset-service";
import { hashPassword } from "@/lib/server/password-hash";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password ?? "";
  const policy = validateLearnerPassword(password);
  if (!policy.ok) {
    return NextResponse.json({ ok: false, message: policy.message }, { status: 400 });
  }

  let email = body.email?.trim().toLowerCase() ?? "";
  const token = body.token?.trim() ?? "";
  const code = body.code?.trim() ?? "";

  if (token) {
    const consumed = await consumePasswordResetToken({ token });
    if (!consumed.ok || !consumed.email) {
      return NextResponse.json(
        { ok: false, message: consumed.message ?? "Invalid or expired reset link." },
        { status: 400 },
      );
    }
    email = consumed.email;
  } else {
    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }
    const otp = await verifyOtpForPurpose(email, code, "reset_password");
    if (!otp.ok) {
      return NextResponse.json(otp, { status: 400 });
    }
  }

  const user = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: false, message: "No account found for this email." }, { status: 404 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.lmsUser.update({
    where: { email },
    data: { passwordHash },
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated. You can sign in with your new password.",
  });
}
