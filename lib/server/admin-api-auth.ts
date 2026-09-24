import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import {
  assertAdminCsrf,
  readAdminSessionClaimsActive,
  readAdminSessionEmailActive,
} from "@/lib/server/admin-session";

/**
 * Admin identity from the httpOnly JWT-style session cookie only.
 * Do NOT trust x-admin-email / ?email= — those are forgeable by attackers.
 */
export async function adminEmailFromRequest(request: Request): Promise<string | null> {
  return readAdminSessionEmailActive(request);
}

/**
 * Returns a 403 response when the request lacks a valid admin session
 * (and CSRF on mutations).
 */
export async function assertMainAdmin(request: Request): Promise<NextResponse | null> {
  const claims = await readAdminSessionClaimsActive(request);
  if (!claims?.email || !isMainAdminEmail(claims.email)) {
    const message = "Admin access required. Sign in at /account?admin=1.";
    return NextResponse.json(
      {
        ok: false,
        message,
        error: message,
      },
      { status: 403 },
    );
  }
  const csrfError = assertAdminCsrf(request, claims);
  if (csrfError) {
    return NextResponse.json(
      { ok: false, message: csrfError, error: csrfError },
      { status: 403 },
    );
  }
  return null;
}
