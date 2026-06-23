import { NextResponse } from "next/server";
import { triggerCertificateGeneration } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/** POST learner + course data to n8n certificate webhook. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  let body: { email?: string; forceRegenerate?: boolean };
  try {
    body = (await request.json()) as { email?: string; forceRegenerate?: boolean };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  try {
    const result = await triggerCertificateGeneration({
      certificateId: id.trim(),
      learnerEmail: email,
      forceRegenerate: body.forceRegenerate === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/generate]", err);
    return NextResponse.json(
      { ok: false, message: "Could not generate certificate." },
      { status: 503 },
    );
  }
}
