import { NextResponse } from "next/server";
import {
  requireLearnerSessionEmail,
  learnerAuthRequiredResponse,
} from "@/lib/server/learner-session";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";

export const dynamic = "force-dynamic";

/**
 * Load the signed-in learner's profile.
 * Identity comes from httpOnly learner session — ?email= is ignored (POC-C-04).
 */
export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const profile = await fetchLmsUserProfile(email);
    if (!profile) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json({ ok: false, message: "Could not load profile" }, { status: 500 });
  }
}
