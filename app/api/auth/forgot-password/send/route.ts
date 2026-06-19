import { NextResponse } from "next/server";
import { sendPasswordResetOtp } from "@/lib/email-otp-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GENERIC_OK =
  "If an account exists for this email, a reset code has been sent. Check your inbox and spam.";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  }

  try {
    const result = await sendPasswordResetOtp(email);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.message?.includes("Too many") ? 429 : 500 });
    }
    return NextResponse.json({
      ok: true,
      message: result.message ?? GENERIC_OK,
      devLogged: result.devLogged,
    });
  } catch (err) {
    console.error("[forgot-password/send]", err);
    return NextResponse.json({ ok: false, message: "Could not send reset code." }, { status: 500 });
  }
}
