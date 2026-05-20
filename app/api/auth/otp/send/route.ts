import { NextResponse } from "next/server";
import { sendRegistrationOtp } from "@/lib/email-otp-service";

export const dynamic = "force-dynamic";

type Body = { email?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Valid email is required" }, { status: 400 });
  }

  try {
    const result = await sendRegistrationOtp(email);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.message?.includes("Too many") ? 429 : 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OTP send failed";
    console.error("[otp/send]", err);
    const hint =
      message.includes("lmsEmailOtp") || message.includes("Cannot read properties of undefined")
        ? "Restart the dev server after running: npm run db:push && npm run db:generate"
        : message;
    return NextResponse.json({ ok: false, message: hint }, { status: 500 });
  }
}
