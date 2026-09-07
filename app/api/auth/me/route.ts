import { NextResponse } from "next/server";
import { requireLearnerSessionEmail } from "@/lib/server/learner-session";
import { readAdminSessionEmailActive } from "@/lib/server/admin-session";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";

export const dynamic = "force-dynamic";

/**
 * Load the signed-in user's profile (learner or admin session).
 * Identity comes from httpOnly session cookies — ?email= is ignored (POC-C-04).
 * Unauthenticated callers get 200 + authenticated:false so the site header can
 * clear stale localStorage without a console 401 on every page.
 */
export async function GET(request: Request) {
  let email = requireLearnerSessionEmail(request);
  if (!email) {
    email = await readAdminSessionEmailActive(request);
  }

  if (!email) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Sign in required." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const profile = await fetchLmsUserProfile(email);
    if (!profile) {
      return NextResponse.json(
        { ok: false, authenticated: true, message: "User not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, authenticated: true, profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load profile" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
