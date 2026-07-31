-- Professional LMS chatbot schema (MySQL)
-- Maps to Prisma models LmsIssue + LmsChatHistory.
-- Existing LMS tables already cover students/courses/enrollments/payments:
--   students     ≈ lms_registration / auth users
--   courses      ≈ course catalog (admin content + DB)
--   enrollments  ≈ lms_purchase
--   payments     ≈ lms_payment

CREATE TABLE IF NOT EXISTS lms_issue (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  issueToken VARCHAR(32) NOT NULL UNIQUE,
  userId VARCHAR(255) NULL,
  userName VARCHAR(255) NULL,
  userEmail VARCHAR(255) NULL,
  studentId VARCHAR(64) NULL,
  issueText TEXT NOT NULL,
  subject VARCHAR(255) NULL,
  issueStatus VARCHAR(32) NOT NULL DEFAULT 'open',
  category VARCHAR(32) NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  sentiment VARCHAR(32) NULL,
  transactionId VARCHAR(128) NULL,
  paymentDate VARCHAR(64) NULL,
  screenshotUrl VARCHAR(1024) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  INDEX lms_issue_issueStatus_idx (issueStatus),
  INDEX lms_issue_priority_idx (priority),
  INDEX lms_issue_createdAt_idx (createdAt),
  INDEX lms_issue_userEmail_idx (userEmail)
);

-- If lms_issue already exists, add new columns:
-- ALTER TABLE lms_issue
--   ADD COLUMN studentId VARCHAR(64) NULL,
--   ADD COLUMN subject VARCHAR(255) NULL,
--   ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium',
--   ADD COLUMN sentiment VARCHAR(32) NULL,
--   ADD COLUMN transactionId VARCHAR(128) NULL,
--   ADD COLUMN paymentDate VARCHAR(64) NULL,
--   ADD COLUMN screenshotUrl VARCHAR(1024) NULL;

CREATE TABLE IF NOT EXISTS lms_chat_history (
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
);
