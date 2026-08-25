import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const tables = await p.$queryRawUnsafe("SHOW TABLES LIKE 'students'");
console.log("students table:", tables);
if (!tables || (Array.isArray(tables) && tables.length === 0)) {
  await p.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS \`students\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`uid\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(32) NULL,
  \`photoUrl\` VARCHAR(1024) NULL,
  \`batch\` VARCHAR(128) NULL,
  \`grade\` VARCHAR(32) NULL,
  \`courseSlug\` VARCHAR(191) NULL,
  \`courseTitle\` VARCHAR(512) NULL,
  \`organizationId\` VARCHAR(191) NULL,
  \`userId\` VARCHAR(191) NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`students_uid_key\` (\`uid\`),
  KEY \`students_organizationId_idx\` (\`organizationId\`),
  KEY \`students_userId_idx\` (\`userId\`),
  KEY \`students_email_idx\` (\`email\`),
  KEY \`students_courseSlug_idx\` (\`courseSlug\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log("created students");
}
await p.$disconnect();
