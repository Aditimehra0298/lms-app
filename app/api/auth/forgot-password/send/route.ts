import { NextResponse } from "next/server";
import { requestPasswordResetEmail } from "@/lib/server/password-reset-service";

export const dynamic = "force-dynamic";

const GENERIC_OK =
  "If an account exists for this email, a password reset link has been sent. Check your inbox and spam.";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await requestPasswordResetEmail({ email: body.email ?? "" });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.message?.includes("Too many") ? 429 : 400,
      });
    }
    return NextResponse.json({
      ok: true,
      message: result.message ?? GENERIC_OK,
    });
  } catch (err) {
    console.error("[forgot-password/send]", err);
    return NextResponse.json({ ok: false, message: "Could not send reset email." }, { status: 500 });
  }
}
