import { NextResponse } from "next/server";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_XSRF_COOKIE,
  adminCsrfCookieHeader,
  adminXsrfCookieHeader,
  readAdminSessionClaimsActive,
} from "@/lib/server/admin-session";
import { touchActiveAdminSession } from "@/lib/server/admin-active-session";

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
    const res = NextResponse.json(
      {
        ok: true,
        allowed: false,
        configured: true,
        message:
          "Admin access requires signing in at /account?admin=1. If signed in on another device, sign out there first — or use Continue on this device.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    // Drop stale admin cookies so this browser stops hammering /api/admin/*.
    // Do NOT clear the exclusive lock here — only logout / takeover / stale timeout may.
    const {
      clearAdminSessionCookieHeader,
      clearAdminCsrfCookieHeader,
      clearAdminXsrfCookieHeader,
    } = await import("@/lib/server/admin-session");
    res.headers.append("Set-Cookie", clearAdminSessionCookieHeader());
    res.headers.append("Set-Cookie", clearAdminCsrfCookieHeader());
    res.headers.append("Set-Cookie", clearAdminXsrfCookieHeader());
    return res;
  }

  // Keep exclusive lock alive while this admin tab is open.
  if (claims?.sid) {
    void touchActiveAdminSession(claims.sid);
  }

  const res = NextResponse.json(
    {
      ok: true,
      allowed: true,
      configured: true,
      email: claims!.email,
      csrfToken: claims!.csrf || undefined,
      xsrfToken: claims!.xsrf || undefined,
      message: "Access granted.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  const existing = request.headers.get("cookie") || "";
  if (claims?.csrf) {
    const hasCsrf = new RegExp(`(?:^|;\\s*)${ADMIN_CSRF_COOKIE}=`).test(existing);
    if (!hasCsrf) {
      res.headers.append("Set-Cookie", adminCsrfCookieHeader(claims.csrf));
    }
  }
  if (claims?.xsrf) {
    const hasXsrf = new RegExp(`(?:^|;\\s*)${ADMIN_XSRF_COOKIE}=`).test(existing);
    if (!hasXsrf) {
      res.headers.append("Set-Cookie", adminXsrfCookieHeader(claims.xsrf));
    }
  }

  return res;
}
