import { NextResponse } from "next/server";
import { verifyOtpForPurpose } from "@/lib/email-otp-service";
import { validateLearnerPassword } from "@/lib/password-policy";
import { hashPassword } from "@/lib/server/password-hash";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; code?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; code?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim() ?? "";
  const password = body.password ?? "";

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  }

  const policy = validateLearnerPassword(password);
  if (!policy.ok) {
    return NextResponse.json({ ok: false, message: policy.message }, { status: 400 });
  }

  const otp = await verifyOtpForPurpose(email, code, "reset_password");
  if (!otp.ok) {
    return NextResponse.json(otp, { status: 400 });
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
