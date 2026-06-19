import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";

export function adminEmailFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return (
    request.headers.get("x-admin-email")?.trim().toLowerCase() ||
    url.searchParams.get("email")?.trim().toLowerCase() ||
    null
  );
}

export function assertMainAdmin(request: Request): NextResponse | null {
  const email = adminEmailFromRequest(request);
  if (!email || !isMainAdminEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin access required." }, { status: 403 });
  }
  return null;
}
