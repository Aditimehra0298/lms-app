import { NextResponse } from "next/server";
import { assertMainAdmin, adminEmailFromRequest } from "@/lib/server/admin-api-auth";
import { uploadManualCertificatePdf } from "@/lib/server/manual-certificate-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Admin → Certificates: upload a hand-made certificate PDF for one learner + course.
 * Published to the learner dashboard immediately; n8n is not used.
 * multipart/form-data: file (PDF), learnerEmail, courseSlug, learnerName (optional).
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Send the PDF as multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const learnerEmail = String(form.get("learnerEmail") ?? "").trim();
  const courseSlug = String(form.get("courseSlug") ?? "").trim();
  const learnerName = String(form.get("learnerName") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, message: "Choose the certificate PDF to upload." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ ok: false, message: "PDF is larger than 20 MB." }, { status: 400 });
  }
  if (!learnerEmail || !courseSlug) {
    return NextResponse.json({ ok: false, message: "Learner email and course are required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
    return NextResponse.json({ ok: false, message: "That file is not a PDF." }, { status: 400 });
  }

  try {
    const result = await uploadManualCertificatePdf({
      learnerEmail,
      courseSlug,
      learnerName: learnerName || undefined,
      pdfBase64: buffer.toString("base64"),
      uploadedByEmail: await adminEmailFromRequest(request),
    });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({
      ok: true,
      certificate: result.certificate,
      message: result.created
        ? "Certificate created and published to the learner's dashboard."
        : "Certificate PDF replaced and published to the learner's dashboard.",
    });
  } catch (err) {
    console.error("[api/admin/certificates/manual-upload]", err);
    return NextResponse.json({ ok: false, message: "Could not upload certificate." }, { status: 503 });
  }
}
