/**
 * Creates lms_payment table when full `prisma db push` is blocked by purchase duplicates.
 * Run: node scripts/ensure-lms-payment-table.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sql = `
CREATE TABLE IF NOT EXISTS \`lms_payment\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`userId\` VARCHAR(191) NULL,
  \`learnerEmail\` VARCHAR(255) NOT NULL,
  \`razorpayOrderId\` VARCHAR(64) NULL,
  \`razorpayPaymentId\` VARCHAR(64) NULL,
  \`receipt\` VARCHAR(64) NULL,
  \`amount\` INTEGER NOT NULL DEFAULT 0,
  \`currency\` VARCHAR(8) NOT NULL DEFAULT 'INR',
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'pending',
  \`method\` VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  \`items\` JSON NOT NULL,
  \`countryCode\` VARCHAR(8) NULL,
  \`adminNote\` VARCHAR(512) NULL,
  \`grantedByEmail\` VARCHAR(255) NULL,
  \`paidAt\` DATETIME(3) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`lms_payment_razorpayOrderId_key\`(\`razorpayOrderId\`),
  INDEX \`lms_payment_learnerEmail_idx\`(\`learnerEmail\`),
  INDEX \`lms_payment_status_idx\`(\`status\`),
  INDEX \`lms_payment_method_idx\`(\`method\`),
  INDEX \`lms_payment_createdAt_idx\`(\`createdAt\`),
  INDEX \`lms_payment_razorpayPaymentId_idx\`(\`razorpayPaymentId\`),
  INDEX \`lms_payment_userId_fkey\`(\`userId\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

try {
  await prisma.$executeRawUnsafe(sql);
  console.log("lms_payment table is ready.");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
