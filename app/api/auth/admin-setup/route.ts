import { NextResponse } from "next/server";
import { getMainAdminEmail } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured } from "@/lib/server/admin-password";
import { publicAdminPanelSettings, readAdminPanelSettings } from "@/lib/server/admin-panel-settings";

export const dynamic = "force-dynamic";

/**
 * Public config for admin sign-in UI.
 * Never expose the admin email (full or masked) — that enables account enumeration (POC-M-01 / POC-C-08).
 * Never leak private/LAN app URLs.
 */
function publicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return "";
    }
    return u.origin;
  } catch {
    return "";
  }
}

export async function GET() {
  const mainConfigured = Boolean(getMainAdminEmail());
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );
  const settings = await readAdminPanelSettings();
  const passwordConfigured = await isAdminPasswordConfigured();

  return NextResponse.json({
    ok: true,
    configured: mainConfigured,
    googleConfigured,
    passwordConfigured,
    requirePanelPassword: settings.requirePanelPassword,
    requireGoogleVerification: settings.requireGoogleVerification && googleConfigured,
    platformName: settings.platformName || "LMS Admin",
    appUrl: publicAppUrl(),
    panel: publicAdminPanelSettings(settings),
  });
}
