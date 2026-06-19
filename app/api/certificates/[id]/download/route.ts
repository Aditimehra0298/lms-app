import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  N8N_ARCHIVED_PDF_MIN_BYTES,
  readCertificatePdfBuffer,
} from "@/lib/server/certificate-pdf-store";
import { ensureCertificatePdfReady } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/**
 * One-shot learner download: prepare (n8n once if needed) → return PDF bytes.
 * Avoids fragile prepare-then-fetch two-step flow in the browser.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  let body: { email?: string; forceRegenerate?: boolean; attachment?: boolean };
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as typeof body;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      const attachmentRaw = form.get("attachment");
      body = {
        email: form.get("email")?.toString(),
        forceRegenerate: form.get("forceRegenerate") === "true",
        attachment: attachmentRaw !== "false" && attachmentRaw !== "0",
      };
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported content type" }, { status: 415 });
    }
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
  }

  const certificateId = id.trim();
  const attachment = body.attachment !== false;

  try {
    let prepared = await ensureCertificatePdfReady({
      certificateId,
      learnerEmail: email,
      forceRegenerate: body.forceRegenerate === true,
    });

    if (!prepared.ok) {
      return NextResponse.json(prepared, {
        status: prepared.status === "awaiting_approval" ? 403 : 409,
      });
    }

    const row = await prisma.lmsCertificate.findUnique({ where: { id: certificateId } });
    const minBytes =
      row?.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128;

    let buffer = await readCertificatePdfBuffer(certificateId, { minBytes });

    if (!buffer && !body.forceRegenerate) {
      prepared = await ensureCertificatePdfReady({
        certificateId,
        learnerEmail: email,
        forceRegenerate: true,
      });
      if (prepared.ok) {
        buffer = await readCertificatePdfBuffer(certificateId, { minBytes });
      }
    }

    if (!buffer) {
      return NextResponse.json(
        {
          ok: false,
          message:
            prepared.message ??
            "Could not save your certificate PDF. Ensure n8n Respond to Webhook returns the full temporary PDF URL as plain text.",
          n8nCalled: prepared.n8nCalled,
        },
        { status: 404 },
      );
    }

    const filename = `${(row?.certificateNumber ?? certificateId).replace(/[^\w.-]+/g, "_")}.pdf`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${attachment ? "attachment" : "inline"}; filename="${filename}"`,
        "X-Certificate-Cached": prepared.cached ? "1" : "0",
      },
    });
  } catch (err) {
    console.error("[certificates/download]", err);
    return NextResponse.json(
      { ok: false, message: "Could not download certificate. Please try again." },
      { status: 503 },
    );
  }
}
