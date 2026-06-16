import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const email = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();
const rows = await prisma.lmsCertificate.findMany({
  where: { learnerEmail: email },
  select: { id: true, courseSlug: true, status: true, issuedVia: true, pdfUrl: true },
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
