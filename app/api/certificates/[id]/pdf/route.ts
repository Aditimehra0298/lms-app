import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCertificateOwnerOrAdmin } from "@/lib/server/certificate-access";
import {
  N8N_ARCHIVED_PDF_MIN_BYTES,
  isTemporaryRemotePdfUrl,
  readCertificatePdfBuffer,
  resolveCertificatePdfPath,
} from "@/lib/server/certificate-pdf-store";
import { ensureCertificatePdfReady } from "@/lib/server/n8n-certificate-service";
import { requireLearnerSessionEmail } from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Serve permanently stored certificate PDF (after n8n callback archived it). */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  const row = await prisma.lmsCertificate.findUnique({ where: { id: id.trim() } });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const denied = assertCertificateOwnerOrAdmin(request, row.learnerEmail);
  if (denied) {
    if (!row.visibleToLearner) {
      return NextResponse.json(
        {
          ok: false,
          message: "Certificate is awaiting admin approval before download.",
        },
        { status: 403 },
      );
    }
    return denied;
  }

  const sessionEmail = requireLearnerSessionEmail(request);
  const isOwner =
    Boolean(sessionEmail) &&
    sessionEmail === row.learnerEmail.trim().toLowerCase();
  const forceDownload = new URL(request.url).searchParams.get("download") === "1";

  const minBytes = row.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128;
  let buffer = await readCertificatePdfBuffer(id.trim(), { minBytes });
  if (!buffer && isOwner && isTemporaryRemotePdfUrl(row.pdfUrl) && sessionEmail) {
    await ensureCertificatePdfReady({
      certificateId: id.trim(),
      learnerEmail: sessionEmail,
      forceRegenerate: false,
    });
    buffer = await readCertificatePdfBuffer(id.trim(), { minBytes });
  }
  if (buffer) {
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=86400",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${row.certificateNumber.replace(/[^\w.-]+/g, "_")}.pdf"`,
      },
    });
  }

  const filePath = await resolveCertificatePdfPath(id.trim());
  if (!filePath && isTemporaryRemotePdfUrl(row.pdfUrl)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Certificate PDF could not be saved permanently yet. Click Download again to retry archiving.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        "Certificate PDF is not saved yet. Click Download again to generate it via n8n.",
    },
    { status: 404 },
  );
}
