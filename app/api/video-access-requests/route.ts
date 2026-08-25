import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export const dynamic = "force-dynamic";

/** Public verify / institute form → video_access_requests (same sft_lms DB). */
export async function POST(request: Request) {
  let body: {
    name?: string;
    organisation?: string;
    organization?: string;
    email?: string;
    location?: string;
    organizationId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const organisation = (body.organisation ?? body.organization)?.trim() ?? "";
  const email = normalizeLearnerEmail(body.email ?? "");
  const location = body.location?.trim() ?? "";
  const organizationId = body.organizationId?.trim() || null;

  if (!name || !organisation || !email || !location) {
    return NextResponse.json(
      { ok: false, message: "name, organisation, email, and location are required." },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.videoAccessRequest.create({
      data: { name, organisation, email, location, organizationId, status: "new" },
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      message: "Video access request submitted to SFT Council.",
    });
  } catch (err) {
    console.error("[video-access-request]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save request. Ensure video_access_requests table exists." },
      { status: 503 },
    );
  }
}
