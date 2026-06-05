import { NextResponse } from "next/server";
import {
  N8N_ARCHIVED_PDF_MIN_BYTES,
  readCertificatePdfBuffer,
  resolveCertificatePdfPath,
} from "@/lib/server/certificate-pdf-store";
import { resolvePublicCertificateRow } from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

/** Public certificate PDF for verified delegate / certificate number (social share links). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const delegate = url.searchParams.get("delegate")?.trim();
  const number = url.searchParams.get("number")?.trim();
  const forceDownload = url.searchParams.get("download") === "1";

  if (!delegate && !number) {
    return NextResponse.json({ ok: false, message: "delegate or number required" }, { status: 400 });
  }

  const row = await resolvePublicCertificateRow({ delegate, number });
  if (!row || row.status !== "ready" || !row.visibleToLearner) {
    return NextResponse.json({ ok: false, message: "Certificate not found" }, { status: 404 });
  }

  const minBytes = row.issuedVia === "n8n" ? N8N_ARCHIVED_PDF_MIN_BYTES : 128;
  const buffer = await readCertificatePdfBuffer(row.id, { minBytes });
  if (buffer) {
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${row.certificateNumber.replace(/[^\w.-]+/g, "_")}.pdf"`,
      },
    });
  }

  const filePath = await resolveCertificatePdfPath(row.id);
  if (!filePath && row.pdfUrl?.trim().startsWith("http")) {
    return NextResponse.redirect(row.pdfUrl.trim());
  }

  return NextResponse.json(
    { ok: false, message: "Certificate PDF is not available yet." },
    { status: 404 },
  );
}
