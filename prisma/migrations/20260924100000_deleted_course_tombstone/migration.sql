-- Durable course-delete tombstones. Survives admin-content.json being overwritten on deploy.
CREATE TABLE IF NOT EXISTS `lms_deleted_course` (
  `slug` VARCHAR(191) NOT NULL,
  `deletedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
