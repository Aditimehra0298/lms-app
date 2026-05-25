-- AlterTable
ALTER TABLE `lms_user` ADD COLUMN `accountType` VARCHAR(32) NULL,
    ADD COLUMN `avatarUrl` VARCHAR(512) NULL,
    ADD COLUMN `phone` VARCHAR(32) NULL,
    ADD COLUMN `companyName` VARCHAR(255) NULL,
    ADD COLUMN `personalEmail` VARCHAR(255) NULL,
    ADD COLUMN `industryType` VARCHAR(64) NULL,
    ADD COLUMN `companySize` VARCHAR(32) NULL;
