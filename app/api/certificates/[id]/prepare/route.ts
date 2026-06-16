import { NextResponse } from "next/server";
import { ensureCertificatePdfReady } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Trigger n8n if needed, then return LMS PDF download path. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  let body: { email?: string; forceRegenerate?: boolean; triggerN8n?: boolean; attachment?: boolean };
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
    const result = await ensureCertificatePdfReady({
      certificateId: id.trim(),
      learnerEmail: email,
      forceRegenerate: body.forceRegenerate === true,
      triggerN8n: body.triggerN8n === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.status === "awaiting_approval" ? 403 : 409,
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/prepare]", err);
    return NextResponse.json({ ok: false, message: "Could not prepare certificate." }, { status: 503 });
  }
}
