import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import {
  adminUpdateCertificateManual,
  setCertificateVisibility,
} from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

/** Admin: show or hide certificate on learner dashboard. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  let body: {
    visibleToLearner?: boolean;
    pdfUrl?: string;
    certificateNumber?: string;
    status?: "ready" | "failed" | "pending";
    allowDownload?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const hasManualFields =
      body.pdfUrl !== undefined ||
      body.certificateNumber !== undefined ||
      body.status !== undefined;

    if (hasManualFields) {
      const result = await adminUpdateCertificateManual({
        certificateId: id,
        pdfUrl: body.pdfUrl,
        certificateNumber: body.certificateNumber,
        status: body.status,
        visibleToLearner: body.allowDownload ?? body.visibleToLearner,
      });
      if (!result.ok) return NextResponse.json(result, { status: 400 });
      return NextResponse.json(result);
    }

    const visible =
      typeof body.allowDownload === "boolean"
        ? body.allowDownload
        : body.visibleToLearner;
    if (typeof visible !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "Send allowDownload, visibleToLearner, or manual fields (pdfUrl, status, …)" },
        { status: 400 },
      );
    }

    const result = await setCertificateVisibility(id, visible);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/certificates PATCH]", err);
    return NextResponse.json({ ok: false, message: "Update failed." }, { status: 503 });
  }
}
