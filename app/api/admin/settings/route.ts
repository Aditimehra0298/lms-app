import { NextResponse } from "next/server";
import { assertMainAdmin, adminEmailFromRequest } from "@/lib/server/admin-api-auth";
import { getMainAdminEmail, isMainAdminEmail, maskEmailForDisplay } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured } from "@/lib/server/admin-password";
import {
  publicAdminPanelSettings,
  readAdminPanelSettings,
  setAdminPanelPassword,
  updateAdminPanelPlatform,
  updateAdminPanelSecurity,
} from "@/lib/server/admin-panel-settings";
import {
  sendAdminSecurityOtp,
  verifyOtpForPurpose,
} from "@/lib/email-otp-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

async function databaseStatusForAdmin() {
  const urlConfigured = Boolean(process.env.DATABASE_URL?.trim());
  let connected = false;
  let hostHint: string | null = null;

  if (urlConfigured) {
    try {
      const raw = process.env.DATABASE_URL!.trim();
      const match = raw.match(/@([^/:]+)(?::(\d+))?\/([^?]+)/);
      if (match) {
        const host = match[1];
        const db = match[3];
        hostHint =
          host === "127.0.0.1" || host === "localhost"
            ? `Local MySQL · database ${db}`
            : `Remote MySQL host · database ${db}`;
      }
      await prisma.$queryRaw`SELECT 1`;
      connected = true;
    } catch {
      connected = false;
    }
  }

  return {
    engine: "MySQL",
    urlConfigured,
    connected,
    hostHint,
    phpMyAdminRequired: false,
    phpMyAdminPurpose: "optional-safety-only",
    summary: connected
      ? "MySQL is connected. The LMS uses it directly. phpMyAdmin is optional — you may set it up for safety checks and backups only."
      : urlConfigured
        ? "MySQL is configured but not reachable right now. Ask your technical team to check the database service."
        : "MySQL is not connected yet. The app needs DATABASE_URL before accounts and payments can use the database.",
    talkingPoints: [
      "We use MySQL as the main database for accounts, payments, and certificates.",
      "phpMyAdmin is not required to run the LMS.",
      "If we install phpMyAdmin, it is for safety only — backups, emergency checks, and inspections.",
      "Developers can use Prisma Studio or MySQL Workbench for the same safety purpose.",
      "The website connects to MySQL securely on the server; learners never see database passwords.",
    ],
    docsPath: "docs/DATABASE_FOR_MANAGEMENT.md",
  };
}

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const settings = await readAdminPanelSettings();
  const main = getMainAdminEmail();
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );

  return NextResponse.json(
    {
      ok: true,
      settings: publicAdminPanelSettings(settings),
      mainAdminMasked: main ? maskEmailForDisplay(main) : null,
      passwordConfigured: await isAdminPasswordConfigured(),
      googleConfigured,
      database: await databaseStatusForAdmin(),
      passwordPolicy: [
        "At least 8 characters",
        "One uppercase letter",
        "One lowercase letter",
        "One number",
        "One special character",
      ],
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const adminEmail = adminEmailFromRequest(request);
  if (!adminEmail || !isMainAdminEmail(adminEmail)) {
    return NextResponse.json({ ok: false, message: "Main administrator only." }, { status: 403 });
  }

  let body: {
    action?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    verificationCode?: string;
    requirePanelPassword?: boolean;
    requireGoogleVerification?: boolean;
    requireEmailVerificationForSensitive?: boolean;
    platformName?: string;
    supportEmail?: string;
    supportPhone?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const settings = await readAdminPanelSettings();

  const requireOtpForAction = async (actionLabel: string) => {
    if (!settings.requireEmailVerificationForSensitive) return null;
    const code = body.verificationCode?.trim() ?? "";
    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          needsVerification: true,
          message: `Enter the email verification code to ${actionLabel}.`,
        },
        { status: 400 },
      );
    }
    const otp = await verifyOtpForPurpose(adminEmail, code, "admin_security");
    if (!otp.ok) {
      return NextResponse.json({ ok: false, message: otp.message ?? "Invalid verification code." }, { status: 400 });
    }
    return null;
  };

  if (body.action === "send-verification") {
    const mail = await sendAdminSecurityOtp(adminEmail);
    if (!mail.ok) {
      return NextResponse.json({ ok: false, message: mail.message ?? "Could not send code." }, { status: 400 });
    }
    return NextResponse.json(
      {
        ok: true,
        message: mail.devLogged
          ? "Verification code logged on the server (email not configured)."
          : "Verification code sent to your admin email.",
      },
      { headers: noStore },
    );
  }

  if (body.action === "change-password") {
    const blocked = await requireOtpForAction("change the admin password");
    if (blocked) return blocked;

    if ((body.newPassword ?? "") !== (body.confirmPassword ?? "")) {
      return NextResponse.json({ ok: false, message: "New password and confirmation do not match." }, { status: 400 });
    }

    const result = await setAdminPanelPassword({
      currentPassword: body.currentPassword ?? "",
      newPassword: body.newPassword ?? "",
      updatedByEmail: adminEmail,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: true, message: "Admin panel password updated. Use it on the next admin sign-in." },
      { headers: noStore },
    );
  }

  if (body.action === "update-security") {
    const blocked = await requireOtpForAction("update security settings");
    if (blocked) return blocked;

    const next = await updateAdminPanelSecurity({
      requirePanelPassword: body.requirePanelPassword,
      requireGoogleVerification: body.requireGoogleVerification,
      requireEmailVerificationForSensitive: body.requireEmailVerificationForSensitive,
      updatedByEmail: adminEmail,
    });
    return NextResponse.json(
      {
        ok: true,
        message: "Security settings saved.",
        settings: publicAdminPanelSettings(next),
      },
      { headers: noStore },
    );
  }

  if (body.action === "update-platform") {
    const next = await updateAdminPanelPlatform({
      platformName: body.platformName,
      supportEmail: body.supportEmail,
      supportPhone: body.supportPhone,
      updatedByEmail: adminEmail,
    });
    return NextResponse.json(
      {
        ok: true,
        message: "Platform details saved.",
        settings: publicAdminPanelSettings(next),
      },
      { headers: noStore },
    );
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
