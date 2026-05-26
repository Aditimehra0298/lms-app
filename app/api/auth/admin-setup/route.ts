import { NextResponse } from "next/server";
import { getMainAdminEmail } from "@/lib/server/admin-emails";
import { isAdminPasswordConfigured } from "@/lib/server/admin-password";

export const dynamic = "force-dynamic";

/** Public config for admin sign-in UI (no secrets). */
export async function GET() {
  const mainAdminEmail = getMainAdminEmail();
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim(),
  );

  return NextResponse.json({
    ok: true,
    mainAdminEmail: mainAdminEmail || null,
    googleConfigured,
    passwordConfigured: isAdminPasswordConfigured(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  });
}
