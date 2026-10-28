import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { deleteStoredCertificatePdf } from "@/lib/server/certificate-pdf-store";
import { triggerCertificateGeneration } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/**
 * Admin-only: delete saved PDF and force a fresh n8n generation
 * (new template after n8n course PDF change).
 */
export async function POST(request: Request, { params }: Params) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  const row = await prisma.lmsCertificate.findUnique({
    where: { id },
    select: {
      id: true,
      learnerEmail: true,
      learnerName: true,
      courseTitle: true,
      courseSlug: true,
      certificateNumber: true,
      status: true,
    },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Certificate not found." }, { status: 404 });
  }

  try {
    await deleteStoredCertificatePdf(id);
    await prisma.lmsCertificate.update({
      where: { id },
      data: { pdfUrl: null, status: "pending", issuedVia: "n8n" },
    });

    const result = await triggerCertificateGeneration({
      certificateId: id,
      learnerEmail: row.learnerEmail.trim().toLowerCase(),
      forceRegenerate: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
          certificateId: id,
          learnerEmail: row.learnerEmail,
          courseTitle: row.courseTitle,
        },
        { status: 409 },
      );
    }

    const fresh = await prisma.lmsCertificate.findUnique({
      where: { id },
      select: { status: true, pdfUrl: true },
    });

    return NextResponse.json({
      ok: true,
      certificateId: id,
      learnerEmail: row.learnerEmail,
      learnerName: row.learnerName,
      courseTitle: row.courseTitle,
      certificateNumber: row.certificateNumber,
      status: fresh?.status ?? result.certificate.status,
      pdfUrl: fresh?.pdfUrl ?? result.certificate.pdfUrl,
      n8nCalled: result.n8nCalled,
      n8nSent: result.n8nSent,
      message:
        fresh?.status === "ready" && fresh.pdfUrl
          ? `New certificate PDF ready for ${row.learnerName || row.learnerEmail}. Hard-refresh View PDF.`
          : result.message ||
            `n8n regenerate started for ${row.courseTitle}. Wait ~1 minute, then View PDF (Ctrl+F5).`,
    });
  } catch (err) {
    console.error("[admin/certificates/regenerate]", err);
    return NextResponse.json(
      { ok: false, message: "Could not regenerate certificate." },
      { status: 503 },
    );
  }
}
