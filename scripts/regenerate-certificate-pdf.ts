/**
 * Regenerate a certificate PDF using the admin-uploaded template.
 *
 * Usage:
 *   npx tsx scripts/regenerate-certificate-pdf.ts [certId] [email]
 */
import { PrismaClient } from "@prisma/client";
import { ensureLocalCertificatePdf } from "../lib/server/local-certificate-fallback";

const prisma = new PrismaClient();
const certId = (process.argv[2] || "cmqetynt00003tdacficwmjow").trim();
const email = (process.argv[3] || "aditimehra0298@gmail.com").trim().toLowerCase();

async function main() {
  const row = await prisma.lmsCertificate.findUnique({ where: { id: certId } });
  if (!row) throw new Error(`Certificate not found: ${certId}`);
  if (row.learnerEmail.trim().toLowerCase() !== email) {
    throw new Error(`Email mismatch: ${row.learnerEmail} !== ${email}`);
  }

  const ok = await ensureLocalCertificatePdf(certId);
  if (!ok) throw new Error("Failed to regenerate certificate PDF.");

  const updated = await prisma.lmsCertificate.findUnique({ where: { id: certId } });
  console.log("[ok] Certificate PDF regenerated:", certId);
  console.log("  template:", updated?.templateImage ?? "(none)");
  console.log("  pdfUrl:", updated?.pdfUrl ?? "(none)");
  console.log(`\nOpen: /my-learning/course/${row.courseSlug}#credentials`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
