import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { requestPasswordResetEmail } from "@/lib/server/password-reset-service";

export const dynamic = "force-dynamic";

/** Admin-triggered password reset email (same n8n webhook as Forgot password). */
export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  let body: { email?: string; learnerName?: string };
  try {
    body = (await request.json()) as { email?: string; learnerName?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await requestPasswordResetEmail({
      email: body.email ?? "",
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
