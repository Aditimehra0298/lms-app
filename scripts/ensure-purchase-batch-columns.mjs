import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
  return rows.length > 0;
}

async function hasIndex(table, name) {
  const rows = await prisma.$queryRawUnsafe(`SHOW INDEX FROM \`${table}\` WHERE Key_name = '${name}'`);
  return rows.length > 0;
}

const purchaseColumns = [
  ["batchKey", "VARCHAR(128) NULL"],
  ["batchLabel", "VARCHAR(255) NULL"],
  ["batchDate", "VARCHAR(128) NULL"],
  ["examUploadUrl", "VARCHAR(512) NULL"],
];

try {
  for (const [col, type] of purchaseColumns) {
    if (await hasColumn("lms_purchase", col)) {
      console.log(`lms_purchase.${col} already exists`);
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`lms_purchase\` ADD COLUMN \`${col}\` ${type}`);
      console.log(`Added lms_purchase.${col}`);
    }
  }

  if (!(await hasIndex("lms_purchase", "lms_purchase_courseSlug_batchKey_idx"))) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `lms_purchase_courseSlug_batchKey_idx` ON `lms_purchase`(`courseSlug`, `batchKey`)",
    );
    console.log("Added index lms_purchase_courseSlug_batchKey_idx");
  }

  if (await hasColumn("lms_email_otp", "attemptCount")) {
    console.log("lms_email_otp.attemptCount already exists");
  } else {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `lms_email_otp` ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 0",
    );
    console.log("Added lms_email_otp.attemptCount");
  }

  const sample = await prisma.lmsPurchase.findFirst({ select: { courseSlug: true } });
  const purchases = await prisma.lmsPurchase.findMany({
    where: { courseSlug: sample?.courseSlug ?? "" },
    include: { user: { select: { email: true } } },
  });
  console.log(`Student query OK for ${sample?.courseSlug}: ${purchases.length} purchase(s)`);
} catch (err) {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
