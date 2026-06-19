/**
 * Delete all certificates (DB + PDF files) for a learner email.
 * Usage: node --env-file=.env.local scripts/delete-learner-certificates.mjs aditimehra0298@gmail.com
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/delete-learner-certificates.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
const pdfDir = path.join(process.cwd(), "storage", "private", "certificates");

try {
  const rows = await prisma.lmsCertificate.findMany({
    where: { learnerEmail: email },
    select: { id: true, courseSlug: true, certificateNumber: true, status: true },
  });

  if (!rows.length) {
    console.log(`No certificates found for ${email}`);
    process.exit(0);
  }

  console.log(`Found ${rows.length} certificate(s) for ${email}:`);
  for (const row of rows) {
    console.log(`  - ${row.id} | ${row.courseSlug} | ${row.certificateNumber} | ${row.status}`);
  }

  for (const row of rows) {
    const filePath = path.join(pdfDir, `${row.id}.pdf`);
    try {
      await unlink(filePath);
      console.log(`Deleted PDF: ${filePath}`);
    } catch {
      console.log(`No PDF on disk: ${row.id}.pdf`);
    }
  }

  const deleted = await prisma.lmsCertificate.deleteMany({
    where: { learnerEmail: email },
  });

  console.log(`\nDeleted ${deleted.count} certificate record(s) from database.`);
  console.log("You can now generate fresh certificates via n8n on next download.");
} finally {
  await prisma.$disconnect();
}
