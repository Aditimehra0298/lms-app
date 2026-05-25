import { NextResponse } from "next/server";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";

export const dynamic = "force-dynamic";

/** Lookup permanent registration ID by email (for n8n / integrations). */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
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
