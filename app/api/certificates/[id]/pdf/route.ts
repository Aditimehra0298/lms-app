import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertCertificateOwnerOrAdmin,
  assertCertificateReleasedToLearner,
} from "@/lib/server/certificate-access";
import {
  isTemporaryRemotePdfUrl,
  readCertificatePdfBuffer,
  resolveCertificatePdfPath,
} from "@/lib/server/certificate-pdf-store";
import {
  ensureCertificatePdfReady,
  waitForArchivedCertificatePdf,
} from "@/lib/server/n8n-certificate-service";
import { officialCertificatePdfMinBytes } from "@/lib/server/certificate-generation-policy";
import { requireLearnerSessionEmail } from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  const notReleased = assertCertificateReleasedToLearner(request, row);
  if (notReleased) return notReleased;

  const sessionEmail = requireLearnerSessionEmail(request);
  const isOwner =
    Boolean(sessionEmail) &&
    sessionEmail === row.learnerEmail.trim().toLowerCase();
  const forceDownload = new URL(request.url).searchParams.get("download") === "1";

  const readOfficialPdf = async () => {
    const fresh = await prisma.lmsCertificate.findUnique({
      where: { id: id.trim() },
      select: { issuedVia: true, certificateNumber: true },
    });
    const minBytes = officialCertificatePdfMinBytes(fresh?.issuedVia ?? row.issuedVia);
    return {
      buffer: await readCertificatePdfBuffer(id.trim(), { minBytes }),
      filename: (fresh?.certificateNumber ?? row.certificateNumber).replace(/[^\w.-]+/g, "_"),
    };
  };

  let { buffer, filename } = await readOfficialPdf();
  if (!buffer && isOwner && sessionEmail) {
    await ensureCertificatePdfReady({
      certificateId: id.trim(),
      learnerEmail: sessionEmail,
      forceRegenerate: false,
    });
    ({ buffer, filename } = await readOfficialPdf());
    if (!buffer) {
      await waitForArchivedCertificatePdf(id.trim(), 45_000);
      ({ buffer, filename } = await readOfficialPdf());
    }
  }
  if (buffer) {
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${filename}.pdf"`,
      },
    });
  }

  const filePath = await resolveCertificatePdfPath(id.trim());
  if (!filePath && isTemporaryRemotePdfUrl(row.pdfUrl)) {
    return new NextResponse(
      "<!DOCTYPE html><html><body style=\"font-family:sans-serif;padding:2rem\"><p>Your certificate is being generated. Please wait a few seconds and refresh.</p></body></html>",
      {
        status: 202,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  }

  return new NextResponse(
    "<!DOCTYPE html><html><body style=\"font-family:sans-serif;padding:2rem\"><p>Your certificate is being generated via n8n. Please wait a few seconds and refresh this page.</p></body></html>",
    {
      status: 202,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
}
