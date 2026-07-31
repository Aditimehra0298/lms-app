const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function trySql(sql) {
  try {
    await p.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 90));
  } catch (e) {
    console.log("SKIP/ERR:", String(e.message).split("\n")[0], "|", sql.slice(0, 90));
  }
}

(async () => {
  await trySql("ALTER TABLE lms_issue ADD COLUMN studentId VARCHAR(64) NULL");
  await trySql("ALTER TABLE lms_issue ADD COLUMN subject VARCHAR(255) NULL");
  await trySql("ALTER TABLE lms_issue ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'");
  await trySql("ALTER TABLE lms_issue ADD COLUMN sentiment VARCHAR(32) NULL");
  await trySql("ALTER TABLE lms_issue ADD COLUMN transactionId VARCHAR(128) NULL");
  await trySql("ALTER TABLE lms_issue ADD COLUMN paymentDate VARCHAR(64) NULL");
  await trySql("ALTER TABLE lms_issue ADD COLUMN screenshotUrl VARCHAR(1024) NULL");
  await trySql("CREATE INDEX lms_issue_priority_idx ON lms_issue(priority)");
  await trySql("CREATE INDEX lms_issue_userEmail_idx ON lms_issue(userEmail)");
  await trySql(`CREATE TABLE IF NOT EXISTS lms_chat_history (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    sessionId VARCHAR(128) NOT NULL,
    learnerEmail VARCHAR(255) NULL,
    learnerName VARCHAR(255) NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(64) NULL,
    provider VARCHAR(32) NULL,
    pagePath VARCHAR(512) NULL,
    ticketToken VARCHAR(32) NULL,
    metadata JSON NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX lms_chat_history_sessionId_createdAt_idx (sessionId, createdAt),
    INDEX lms_chat_history_learnerEmail_createdAt_idx (learnerEmail, createdAt),
    INDEX lms_chat_history_createdAt_idx (createdAt)
  )`);
  await p.$disconnect();
})();
