-- CreateTable
CREATE TABLE `lms_user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NULL,
    `role` VARCHAR(32) NOT NULL DEFAULT 'learner',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lms_user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lms_purchase` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `learnerEmail` VARCHAR(255) NOT NULL,
    `courseSlug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(512) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lms_purchase_learnerEmail_idx`(`learnerEmail`),
    INDEX `lms_purchase_courseSlug_idx`(`courseSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lms_purchase` ADD CONSTRAINT `lms_purchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `lms_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
