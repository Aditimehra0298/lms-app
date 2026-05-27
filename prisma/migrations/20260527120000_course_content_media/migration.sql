-- Course content JSON + media upload registry (URLs only, not video binaries).
-- Run: npx prisma migrate deploy   OR paste in MySQL Workbench.

CREATE TABLE IF NOT EXISTS `lms_course_content` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `courseSlug` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `lms_course_content_courseId_key` (`courseId`),
  UNIQUE INDEX `lms_course_content_courseSlug_key` (`courseSlug`),
  INDEX `lms_course_content_courseSlug_idx` (`courseSlug`),
  CONSTRAINT `lms_course_content_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `lms_course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lms_media_asset` (
  `id` VARCHAR(191) NOT NULL,
  `url` VARCHAR(1024) NOT NULL,
  `originalName` VARCHAR(255) NULL,
  `mimeType` VARCHAR(128) NULL,
  `sizeBytes` INT NULL,
  `kind` VARCHAR(32) NOT NULL,
  `courseSlug` VARCHAR(191) NULL,
  `uploadedBy` VARCHAR(255) NULL,
  `storage` VARCHAR(32) NOT NULL DEFAULT 'local',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `lms_media_asset_courseSlug_idx` (`courseSlug`),
  INDEX `lms_media_asset_kind_idx` (`kind`),
  INDEX `lms_media_asset_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example: list lesson videos registered in DB
-- SELECT courseSlug, url, originalName, sizeBytes, createdAt FROM lms_media_asset WHERE kind = 'video' ORDER BY createdAt DESC;
