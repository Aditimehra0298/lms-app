import { prisma } from "@/lib/prisma";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveCertificatePermissions } from "@/lib/server/certificate-permissions";
import { resolveCertificateConfig } from "@/lib/server/certificate-service";
import {
  buildCourseCertificateAndTranscriptPdf,
} from "@/lib/server/certificate-pdf-builder";
import { formatGrade } from "@/lib/certificate-payload-fields";
import {
  persistCertificatePdf,
  deleteStoredCertificatePdf,
  certificatePdfServePath,
} from "@/lib/server/certificate-pdf-store";
import {
  findCertificateConfigForSlug,
} from "@/lib/global-certificate-assets";
import { resolveCourseCertificateAssets } from "@/lib/server/certificate-generation-policy";
import type { LmsCertificate } from "@prisma/client";

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Simple text PDF when n8n cannot callback (local dev) or workflow is unavailable. */
export function buildFallbackCertificatePdf(input: {
  learnerName: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: string;
  scorePercent?: number | null;
}): Buffer {
  const lines = [
    "SF Trainings — Certificate of Completion",
    input.learnerName,
    input.courseTitle,
    `Certificate No: ${input.certificateNumber}`,
    `Issue Date: ${input.issueDate}`,
    input.scorePercent != null ? `Score: ${input.scorePercent}%` : "",
  ].filter(Boolean);

  let y = 720;
  const streamLines = ["BT", "/F1 14 Tf"];
  for (const line of lines) {
    streamLines.push(`1 0 0 1 72 ${y} Tm (${pdfEscape(line)}) Tj`);
    y -= 28;
  }
  streamLines.push("ET");
  const stream = streamLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "utf8");

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${streamLen}>>stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000334 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
500
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function buildCertificatePdfForRow(
  row: LmsCertificate,
  content: Awaited<ReturnType<typeof readAdminContent>>,
): Promise<Buffer> {
  const program = findCertificateProgram(content, row.courseSlug);
  const cfg = program ? resolveCertificateConfig(program, content) : null;

  const issueDate = row.issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const plainInput = {
    learnerName: row.learnerName ?? row.learnerEmail,
    courseTitle: row.courseTitle,
    certificateNumber: row.certificateNumber,
    issueDate,
    scorePercent: row.scorePercent,
  };

  const courseCfg = findCertificateConfigForSlug(content, row.courseSlug);
  const assets = resolveCourseCertificateAssets(content, row.courseSlug);

  const templateImageUrl =
    courseCfg?.templateImage?.trim() ||
    row.templateImage?.trim() ||
    assets.templateImage?.trim() ||
    "/certificates/haccp-certificate-template.jpg";
  const badgeImageUrl =
    courseCfg?.badgeImage?.trim() || row.badgeImage?.trim() || assets.badgeImage?.trim() || null;
  const transcriptImage =
    courseCfg?.transcriptFile?.trim() || assets.transcriptFile?.trim() || null;

  const pdf = await buildCourseCertificateAndTranscriptPdf({
    ...plainInput,
    grade: formatGrade(row.scorePercent),
    templateImageUrl,
    transcriptImageUrl: transcriptImage,
    badgeImageUrl: badgeImageUrl,
    layout: {
      nameTopPercent: courseCfg?.nameTopPercent ?? cfg?.nameTopPercent,
      numberTopPercent: courseCfg?.numberTopPercent ?? cfg?.numberTopPercent,
      dateTopPercent: courseCfg?.dateTopPercent ?? cfg?.dateTopPercent,
      overlayCourseTitle: courseCfg?.overlayCourseTitle,
      overlayScore: courseCfg?.overlayScore,
      overlayBadge: courseCfg?.overlayBadge,
    },
  });

  if (!pdf) {
    return buildFallbackCertificatePdf(plainInput);
  }

  return pdf;
}

/** Finish a pending certificate on LMS disk when n8n callback URL is not reachable. */
export async function applyLocalCertificateFallback(certificateId: string): Promise<boolean> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: certificateId.trim() } });
  if (!row || row.status === "ready") return false;

  const content = await readAdminContent();
  const program = findCertificateProgram(content, row.courseSlug);
  const perms = program ? resolveCertificatePermissions(program) : null;

  const pdf = await buildCertificatePdfForRow(row, content);

  const persisted = await persistCertificatePdf({
    certificateId: row.id,
    pdfBase64: pdf.toString("base64"),
  });

  const visible =
    perms?.autoVisibleWhenReady !== false && perms?.requireAdminApproval !== true;

  await prisma.lmsCertificate.update({
    where: { id: row.id },
    data: {
      status: "ready",
      pdfUrl: persisted.ok ? persisted.storedUrl : null,
      visibleToLearner: visible || true,
      issuedVia: "local-fallback",
    },
  });

  return true;
}

/** Resolve any pending/failed certificates for a learner (dev recovery). */
export async function recoverPendingCertificatesForEmail(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  const pending = await prisma.lmsCertificate.findMany({
    where: { learnerEmail: normalized, status: { in: ["pending", "failed"] } },
  });
  let count = 0;
  for (const row of pending) {
    if (await applyLocalCertificateFallback(row.id)) count += 1;
  }
  return count;
}

/** Create or replace the on-disk PDF for a certificate (dev / n8n-unavailable recovery). */
export async function ensureLocalCertificatePdf(certificateId: string): Promise<boolean> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: certificateId.trim() } });
  if (!row) return false;

  const content = await readAdminContent();
  const program = findCertificateProgram(content, row.courseSlug);
  const perms = program ? resolveCertificatePermissions(program) : null;

  const pdf = await buildCertificatePdfForRow(row, content);

  const persisted = await persistCertificatePdf({
    certificateId: row.id,
    pdfBase64: pdf.toString("base64"),
  });

  if (!persisted.ok) return false;

  await prisma.lmsCertificate.update({
    where: { id: row.id },
    data: {
      status: "ready",
      pdfUrl: persisted.storedUrl,
      visibleToLearner: true,
      issuedVia: row.issuedVia === "n8n" ? "local-fallback" : row.issuedVia ?? "local-fallback",
    },
  });

  return true;
}

/**
 * Build the learner PDF on the course's admin-uploaded certificate template
 * (name, number, date overlaid on templateImage from course settings).
 */
export async function generateCertificateFromCourseTemplate(input: {
  certificateId: string;
  learnerEmail: string;
  forceRegenerate?: boolean;
}): Promise<
  | {
      ok: true;
      downloadUrl: string;
      templateImage: string;
      usedTemplatedPdf: boolean;
      message: string;
    }
  | { ok: false; message: string }
> {
  const email = input.learnerEmail.trim().toLowerCase();
  const id = input.certificateId.trim();
  if (!email || !id) {
    return { ok: false, message: "Email and certificate id are required." };
  }

  const row = await prisma.lmsCertificate.findUnique({ where: { id } });
  if (!row || row.learnerEmail.trim().toLowerCase() !== email) {
    return { ok: false, message: "Certificate not found." };
  }

  const content = await readAdminContent();
  const courseCfg = findCertificateConfigForSlug(content, row.courseSlug);
  const assets = resolveCourseCertificateAssets(content, row.courseSlug);
  const templateImage =
    courseCfg?.templateImage?.trim() ||
    row.templateImage?.trim() ||
    assets.templateImage?.trim() ||
    "";

  if (!templateImage) {
    return {
      ok: false,
      message:
        "No certificate template uploaded for this course. Upload one under Admin → Course → Certificates.",
    };
  }

  const program = findCertificateProgram(content, row.courseSlug);
  const perms = program ? resolveCertificatePermissions(program) : null;

  if (input.forceRegenerate) {
    await deleteStoredCertificatePdf(id);
    await prisma.lmsCertificate.update({
      where: { id },
      data: { pdfUrl: null, status: "pending" },
    });
  }

  const cfg = program ? resolveCertificateConfig(program, content) : null;
  const issueDate = row.issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const badgeImage =
    courseCfg?.badgeImage?.trim() || row.badgeImage?.trim() || assets.badgeImage?.trim() || null;

  const transcriptImage =
    courseCfg?.transcriptFile?.trim() || assets.transcriptFile?.trim() || null;

  const pdf = await buildCourseCertificateAndTranscriptPdf({
    learnerName: row.learnerName ?? row.learnerEmail,
    courseTitle: row.courseTitle,
    certificateNumber: row.certificateNumber,
    issueDate,
    scorePercent: row.scorePercent,
    grade: formatGrade(row.scorePercent),
    templateImageUrl: templateImage,
    transcriptImageUrl: transcriptImage,
    badgeImageUrl: badgeImage,
    layout: {
      nameTopPercent: courseCfg?.nameTopPercent ?? cfg?.nameTopPercent,
      numberTopPercent: courseCfg?.numberTopPercent ?? cfg?.numberTopPercent,
      dateTopPercent: courseCfg?.dateTopPercent ?? cfg?.dateTopPercent,
      overlayCourseTitle: courseCfg?.overlayCourseTitle,
      overlayScore: courseCfg?.overlayScore,
      overlayBadge: courseCfg?.overlayBadge,
    },
  });

  if (!pdf) {
    return {
      ok: false,
      message:
        "Could not read the uploaded certificate template file. Re-upload the template in Admin → Course → Certificates.",
    };
  }

  const usedTemplated = true;

  const persisted = await persistCertificatePdf({
    certificateId: id,
    pdfBase64: pdf.toString("base64"),
  });

  if (!persisted.ok) {
    return { ok: false, message: persisted.message ?? "Could not save certificate PDF." };
  }

  const visible =
    perms?.autoVisibleWhenReady !== false && perms?.requireAdminApproval !== true;

  await prisma.lmsCertificate.update({
    where: { id },
    data: {
      status: "ready",
      pdfUrl: persisted.storedUrl,
      visibleToLearner: visible || true,
      issuedVia: "course-template",
      templateImage,
      badgeImage: courseCfg?.badgeImage?.trim() || row.badgeImage || assets.badgeImage,
    },
  });

  return {
    ok: true,
    downloadUrl: certificatePdfServePath(id),
    templateImage,
    usedTemplatedPdf: usedTemplated,
    message: "Certificate generated on your uploaded course template.",
  };
}
