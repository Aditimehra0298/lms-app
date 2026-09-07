import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import {
  ADMIN_CSRF_COOKIE,
  adminCsrfCookieHeader,
  readAdminSessionClaimsActive,
} from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

/**
 * Admin access check — JWT httpOnly session cookie + exclusive sid registry.
 *
 * Intentionally ignores:
 * - ?email= query (client-controlled — POC-C-03)
 * - x-admin-email header
 * - sft_learner_email / sft_user_role cookies
 *
 * Does not reveal the main admin address (even masked) to anonymous callers.
 */
export async function GET(request: Request) {
  void new URL(request.url).searchParams.get("email");
  void request.headers.get("x-admin-email");

  const claims = await readAdminSessionClaimsActive(request);
  const allowed = Boolean(claims?.email && isMainAdminEmail(claims.email));

  if (!allowed) {
    return NextResponse.json(
      {
        ok: true,
        allowed: false,
        configured: true,
        message:
          "Admin access requires signing in at /account?admin=1. If signed in on another device, sign out there first.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const res = NextResponse.json(
    {
      ok: true,
      allowed: true,
      configured: true,
      email: claims!.email,
      csrfToken: claims!.csrf || undefined,
      message: "Access granted.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  if (claims?.csrf) {
    const existing = request.headers.get("cookie") || "";
    const hasCsrf = new RegExp(`(?:^|;\\s*)${ADMIN_CSRF_COOKIE}=`).test(existing);
    if (!hasCsrf) {
      res.headers.append("Set-Cookie", adminCsrfCookieHeader(claims.csrf));
    }
  }

  return res;
}
