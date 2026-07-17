import { NextResponse } from "next/server";
import { getMainAdminEmail, isMainAdminEmail, maskEmailForDisplay } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured, verifyAdminPanelPassword } from "@/lib/server/admin-password";
import { createAdminVerifyToken } from "@/lib/server/admin-verify-token";
import { readAdminPanelSettings } from "@/lib/server/admin-panel-settings";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";
import { getClientIps } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Step 1 of admin login: verify email + password (when required). Step 2 may be Google. */
export async function POST(request: Request) {
  const settings = await readAdminPanelSettings();
  const passwordConfigured = await isAdminPasswordConfigured();

  if (settings.requirePanelPassword && !passwordConfigured) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin password is not set yet. Contact your platform owner to set the first password.",
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

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
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

  if (settings.requirePanelPassword) {
    if (!password) {
      return NextResponse.json({ ok: false, message: "Password is required." }, { status: 400 });
    }
    const ok = await verifyAdminPanelPassword(password);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Incorrect admin password." }, { status: 401 });
    }
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );
  const requiresGoogle = settings.requireGoogleVerification && googleConfigured;

  if (!requiresGoogle) {
    const ips = getClientIps(request);
    try {
      await prisma.lmsUser.upsert({
        where: { email },
        create: {
          email,
          role: "admin",
          accountType: "self",
          ipv4: ips.ipv4,
          ipv6: ips.ipv6,
          lastLoginAt: new Date(),
          emailVerifiedAt: new Date(),
        },
        update: {
          role: "admin",
          accountType: "self",
          ipv4: ips.ipv4 ?? undefined,
          ipv6: ips.ipv6 ?? undefined,
          lastLoginAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[auth/admin-login] profile upsert", err);
    }
    const profile = await fetchLmsUserProfile(email);
    return NextResponse.json({
      ok: true,
      requiresGoogleVerification: false,
      email,
      role: "admin",
      accountType: "self",
      profile,
    });
  }

  const verifyToken = createAdminVerifyToken(email);

  return NextResponse.json({
    ok: true,
    requiresGoogleVerification: true,
    email,
    verifyToken,
  });
}
