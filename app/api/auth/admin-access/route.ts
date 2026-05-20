import { NextResponse } from "next/server";
import {
  getMainAdminEmail,
  isMainAdminEmail,
  maskEmailForDisplay,
} from "@/lib/server/admin-emails";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  const main = getMainAdminEmail();

  if (!main) {
    return NextResponse.json({
      ok: false,
      allowed: false,
      configured: false,
      message: "MAIN_ADMIN_EMAIL is not set in .env.local",
    });
  }

  if (!email) {
    return NextResponse.json({
      ok: true,
      allowed: false,
      configured: true,
      mainAdminMasked: maskEmailForDisplay(main),
      message: "Sign in with Google using the main administrator account.",
    });
  }

  const allowed = isMainAdminEmail(email);

  return NextResponse.json({
    ok: true,
    allowed,
    configured: true,
    mainAdminMasked: maskEmailForDisplay(main),
    message: allowed
      ? "Access granted."
      : `Admin access requires permission from the main account (${maskEmailForDisplay(main)}). Sign in with that Google account or ask the owner to add you.`,
  });
}
