import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/server/admin-emails";
import {
  openCertificatePdfStream,
  resolveCertificatePdfPath,
} from "@/lib/server/certificate-pdf-store";

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

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  const isOwner = email && email === row.learnerEmail.trim().toLowerCase();
  const isAdmin = email && isAdminEmail(email);
  const canLearner = isOwner && row.status === "ready" && row.visibleToLearner;

  if (!canLearner && !isAdmin) {
    return NextResponse.json(
      { ok: false, message: "Add ?email= learner or admin email to download." },
      { status: 403 },
    );
  }

  const filePath = await resolveCertificatePdfPath(id.trim());
  if (!filePath) {
    if (row.pdfUrl?.startsWith("http")) {
      return NextResponse.redirect(row.pdfUrl);
    }
    return NextResponse.json({ ok: false, message: "PDF not archived yet." }, { status: 404 });
  }

  const info = await stat(filePath);
  const stream = openCertificatePdfStream(id.trim());

  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(info.size),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${row.certificateNumber.replace(/[^\w.-]+/g, "_")}.pdf"`,
    },
  });
}
