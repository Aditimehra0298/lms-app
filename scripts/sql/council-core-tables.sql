-- Council / institute sync tables for sft_lms
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(191) NOT NULL,
  `uid` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(32) NULL,
  `photoUrl` VARCHAR(1024) NULL,
  `batch` VARCHAR(128) NULL,
  `grade` VARCHAR(32) NULL,
  `courseSlug` VARCHAR(191) NULL,
  `courseTitle` VARCHAR(512) NULL,
  `organizationId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_uid_key` (`uid`),
  KEY `students_organizationId_idx` (`organizationId`),
  KEY `students_userId_idx` (`userId`),
  KEY `students_email_idx` (`email`),
  KEY `students_courseSlug_idx` (`courseSlug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `video_access_requests` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `organisation` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `organizationId` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `video_access_requests_email_idx` (`email`),
  KEY `video_access_requests_status_idx` (`status`),
  KEY `video_access_requests_organizationId_idx` (`organizationId`),
  KEY `video_access_requests_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_training_videos` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(512) NOT NULL,
  `courseSlug` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'missing',
  `videoUrl` VARCHAR(1024) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `student_training_videos_studentId_idx` (`studentId`),
  KEY `student_training_videos_status_idx` (`status`),
  KEY `student_training_videos_courseSlug_idx` (`courseSlug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `institute_staff_link` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'institute_admin',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `institute_staff_link_email_key` (`email`),
  KEY `institute_staff_link_organizationId_idx` (`organizationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
