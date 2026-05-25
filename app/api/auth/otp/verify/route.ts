import { NextResponse } from "next/server";
import { verifyRegistrationOtp } from "@/lib/email-otp-service";

export const dynamic = "force-dynamic";

type Body = { email?: string; code?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ ok: false, message: "OTP code is required" }, { status: 400 });
  }

  try {
    const result = await verifyRegistrationOtp(email, code);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[otp/verify]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Verification failed. Restart dev server after npm run db:generate",
      },
      { status: 500 },
    );
  }
}
