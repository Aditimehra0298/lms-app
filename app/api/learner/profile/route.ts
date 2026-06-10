import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { fetchLmsUserProfile } from "@/lib/server/lms-user-profile";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  companyName?: string;
  personalEmail?: string;
  industryType?: string;
  companySize?: string;
};

function trimOrNull(value?: string): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** Update learner profile — editable after registration. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const email = normalizeLearnerEmail(body.email?.trim() ?? "");
    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
    }

    const existing = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Learner not found" }, { status: 404 });
    }

    await prisma.lmsUser.update({
      where: { email },
      data: {
        name: trimOrNull(body.name),
        phone: trimOrNull(body.phone),
        companyName: trimOrNull(body.companyName),
        personalEmail: trimOrNull(body.personalEmail),
        industryType: trimOrNull(body.industryType),
        companySize: trimOrNull(body.companySize),
      },
    });

    const profile = await fetchLmsUserProfile(email);
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("[api/learner/profile]", err);
    return NextResponse.json(
      { ok: false, message: "Could not update profile" },
      { status: 503 },
    );
  }
}
