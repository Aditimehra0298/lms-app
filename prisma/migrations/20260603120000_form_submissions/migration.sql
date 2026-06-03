-- CreateTable
CREATE TABLE `lms_form_submission` (
    `id` VARCHAR(191) NOT NULL,
    `formType` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'new',
    `name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(64) NULL,
    `subject` VARCHAR(255) NULL,
    `category` VARCHAR(64) NULL,
    `message` TEXT NULL,
    `pagePath` VARCHAR(512) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lms_form_submission_formType_idx`(`formType`),
    INDEX `lms_form_submission_status_idx`(`status`),
    INDEX `lms_form_submission_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
