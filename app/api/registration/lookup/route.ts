import { NextResponse } from "next/server";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";
import { readAdminSessionEmail } from "@/lib/server/admin-session";
import { readLearnerSessionEmail } from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

function authorizeLookup(request: Request, email: string): boolean {
  const secret =
    process.env.REGISTRATION_LOOKUP_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (secret) {
    const header = request.headers.get("authorization")?.trim() ?? "";
    if (header === `Bearer ${secret}`) return true;
    if (request.headers.get("x-lookup-secret")?.trim() === secret) return true;
  }

  const admin = readAdminSessionEmail(request);
  if (admin) return true;

  const learner = readLearnerSessionEmail(request);
  return Boolean(learner && learner === email.trim().toLowerCase());
}

/**
 * Registration / PII lookup — not public.
 * Allowed: own learner session, admin session, or REGISTRATION_LOOKUP_SECRET / CRON_SECRET.
 */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }
  if (!authorizeLookup(request, email)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const registration = await lookupRegistrationByEmail(email);
    if (!registration) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, registration });
  } catch (err) {
    console.error("[registration/lookup]", err);
    return NextResponse.json({ ok: false, message: "Lookup unavailable." }, { status: 503 });
  }
}
