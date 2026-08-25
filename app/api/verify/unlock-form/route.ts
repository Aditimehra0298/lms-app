import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public verify-website unlock form → same MySQL DB as Council admin. */
export async function POST(request: Request) {
  let body: {
    name?: string;
    organisation?: string;
    organization?: string;
    email?: string;
    location?: string;
    instituteId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const organisation = (body.organisation ?? body.organization)?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const location = body.location?.trim() ?? "";
  const instituteId = body.instituteId?.trim() || null;

  if (!name || !organisation || !email || !location) {
    return NextResponse.json(
      { ok: false, message: "name, organisation, email, and location are required." },
      { status: 400 },
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Valid email required." }, { status: 400 });
  }

  try {
    if (instituteId) {
      const exists = await prisma.sftInstitute.findUnique({ where: { id: instituteId }, select: { id: true } });
      if (!exists) {
        return NextResponse.json({ ok: false, message: "Unknown institute." }, { status: 400 });
      }
    }

    const form = await prisma.sftVerifyUnlockForm.create({
      data: { name, organisation, email, location, instituteId, status: "new" },
    });

    return NextResponse.json({
      ok: true,
      id: form.id,
      message: "Unlock request submitted. SFT Council will review it.",
    });
  } catch (err) {
    console.error("[verify/unlock-form]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save form. Ensure MySQL tables exist (npm run db:push)." },
      { status: 503 },
    );
  }
}
