import { NextResponse } from "next/server";
import { getMainAdminEmail, isMainAdminEmail, maskEmailForDisplay } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured, verifyAdminPassword } from "@/lib/server/admin-password";
import { createAdminVerifyToken } from "@/lib/server/admin-verify-token";

export const dynamic = "force-dynamic";

/** Step 1 of admin login: verify email + password only. Step 2 is Google (client). */
export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin password is not configured. Set ADMIN_PASSWORD in .env.local.",
      },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  if (!isMainAdminEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        message: `Only the main administrator (${maskEmailForDisplay(getMainAdminEmail())}) can sign in here.`,
      },
      { status: 403 },
    );
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ ok: false, message: "Incorrect admin password." }, { status: 401 });
  }

  const verifyToken = createAdminVerifyToken(email);

  return NextResponse.json({
    ok: true,
    requiresGoogleVerification: true,
    email,
    verifyToken,
  });
}
