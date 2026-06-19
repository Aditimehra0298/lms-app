import { NextResponse } from "next/server";
import { triggerN8nCertificateGeneration } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/** POST course_completed + course template assets to n8n (learner Generate button). */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  try {
    const result = await triggerN8nCertificateGeneration({
      certificateId: id.trim(),
      learnerEmail: email,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/trigger-n8n]", err);
    return NextResponse.json(
      { ok: false, message: "Could not trigger n8n certificate workflow." },
      { status: 503 },
    );
  }
}
