import { NextResponse } from "next/server";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";

export const dynamic = "force-dynamic";

/** Load saved user profile from MySQL (email from client session). */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
  }

  try {
    const profile = await fetchLmsUserProfile(email);
    if (!profile) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json({ ok: false, message: "Could not load profile" }, { status: 500 });
  }
}
