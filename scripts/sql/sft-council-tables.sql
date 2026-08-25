-- SFT Global Skill Assessment Council tables (MySQL sft_lms)
-- Run in Workbench or: mysql -u root -p sft_lms < scripts/sql/sft-council-tables.sql

CREATE TABLE IF NOT EXISTS `sft_institute` (
  `id` VARCHAR(191) NOT NULL,
  `uid` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `logoUrl` VARCHAR(1024) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sft_institute_uid_key` (`uid`),
  UNIQUE KEY `sft_institute_email_key` (`email`),
  KEY `sft_institute_status_idx` (`status`),
  KEY `sft_institute_name_idx` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_institute_staff` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'institute_admin',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sft_institute_staff_email_key` (`email`),
  KEY `sft_institute_staff_instituteId_idx` (`instituteId`),
  CONSTRAINT `sft_institute_staff_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_institute_course` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(512) NOT NULL,
  `code` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sft_institute_course_instituteId_code_key` (`instituteId`, `code`),
  KEY `sft_institute_course_instituteId_idx` (`instituteId`),
  KEY `sft_institute_course_status_idx` (`status`),
  CONSTRAINT `sft_institute_course_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_institute_student` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NULL,
  `uid` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `photoUrl` VARCHAR(1024) NULL,
  `phone` VARCHAR(32) NULL,
  `email` VARCHAR(255) NULL,
  `batch` VARCHAR(128) NULL,
  `grade` VARCHAR(32) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sft_institute_student_uid_key` (`uid`),
  KEY `sft_institute_student_instituteId_idx` (`instituteId`),
  KEY `sft_institute_student_courseId_idx` (`courseId`),
  KEY `sft_institute_student_email_idx` (`email`),
  CONSTRAINT `sft_institute_student_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sft_institute_student_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `sft_institute_course` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_training_video` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NULL,
  `title` VARCHAR(512) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'missing',
  `videoUrl` VARCHAR(1024) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sft_training_video_instituteId_idx` (`instituteId`),
  KEY `sft_training_video_courseId_idx` (`courseId`),
  KEY `sft_training_video_status_idx` (`status`),
  CONSTRAINT `sft_training_video_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sft_training_video_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `sft_institute_course` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_institute_certificate` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NULL,
  `studentId` VARCHAR(191) NULL,
  `certificateNumber` VARCHAR(64) NOT NULL,
  `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `pdfUrl` VARCHAR(1024) NULL,
  `verifyUrl` VARCHAR(1024) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sft_institute_certificate_certificateNumber_key` (`certificateNumber`),
  KEY `sft_institute_certificate_instituteId_idx` (`instituteId`),
  KEY `sft_institute_certificate_studentId_idx` (`studentId`),
  KEY `sft_institute_certificate_courseId_idx` (`courseId`),
  CONSTRAINT `sft_institute_certificate_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sft_institute_certificate_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `sft_institute_course` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sft_institute_certificate_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `sft_institute_student` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sft_verify_unlock_form` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NULL,
  `name` VARCHAR(255) NOT NULL,
  `organisation` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sft_verify_unlock_form_email_idx` (`email`),
  KEY `sft_verify_unlock_form_status_idx` (`status`),
  KEY `sft_verify_unlock_form_instituteId_idx` (`instituteId`),
  KEY `sft_verify_unlock_form_createdAt_idx` (`createdAt`),
  CONSTRAINT `sft_verify_unlock_form_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `sft_institute` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
