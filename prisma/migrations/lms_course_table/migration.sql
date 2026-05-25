-- Course catalog in MySQL (IDs from 101). Run via prisma db push or Workbench.

CREATE TABLE IF NOT EXISTS `lms_course` (
  `id` VARCHAR(191) NOT NULL,
  `courseIdentificationNumber` INT NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(512) NOT NULL,
  `subtitle` VARCHAR(512) NULL,
  `category` VARCHAR(128) NULL,
  `level` VARCHAR(64) NULL,
  `published` BOOLEAN NOT NULL DEFAULT true,
  `learningFormat` VARCHAR(32) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `lms_course_courseIdentificationNumber_key` (`courseIdentificationNumber`),
  UNIQUE INDEX `lms_course_slug_key` (`slug`),
  INDEX `lms_course_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SELECT courseIdentificationNumber, slug, title FROM lms_course ORDER BY courseIdentificationNumber;
