import { prisma } from "@/lib/prisma";
import { findCertificateProgram } from "@/lib/certificate-program-resolve";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveCertificatePermissions } from "@/lib/server/certificate-permissions";
import {
  persistCertificatePdf,
} from "@/lib/server/certificate-pdf-store";

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

/** Finish a pending certificate on LMS disk when n8n callback URL is not reachable. */
export async function applyLocalCertificateFallback(certificateId: string): Promise<boolean> {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: certificateId.trim() } });
  if (!row || row.status === "ready") return false;

  const content = await readAdminContent();
  const program = findCertificateProgram(content, row.courseSlug);
  const perms = program ? resolveCertificatePermissions(program) : null;

  const issueDate = row.issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const pdf = buildFallbackCertificatePdf({
    learnerName: row.learnerName ?? row.learnerEmail,
    courseTitle: row.courseTitle,
    certificateNumber: row.certificateNumber,
    issueDate,
    scorePercent: row.scorePercent,
  });

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
