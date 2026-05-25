import { NextResponse } from "next/server";
import { completeN8nCertificateCallback } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** n8n workflow calls this when PDF is ready. */
export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-webhook-secret");
    if (header !== secret) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    certificateId?: string;
    certificateNumber?: string;
    pdfUrl?: string;
    status?: "ready" | "failed";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await completeN8nCertificateCallback({
      certificateId: body.certificateId ?? "",
      certificateNumber: body.certificateNumber,
      pdfUrl: body.pdfUrl,
      status: body.status,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[certificates/n8n-callback]", err);
    return NextResponse.json({ ok: false, message: "Callback failed." }, { status: 503 });
  }
}
