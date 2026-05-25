-- Organisation identification table (run in MySQL Workbench if prisma db push is not used)
-- IDs start at 101. Certificate numbers use format: {id}-org/{MM-YYYY}/{sequence}

CREATE TABLE IF NOT EXISTS `lms_organization` (
  `id` VARCHAR(191) NOT NULL,
  `identificationNumber` INT NOT NULL,
  `companyName` VARCHAR(255) NOT NULL,
  `workEmail` VARCHAR(255) NOT NULL,
  `personalEmail` VARCHAR(255) NULL,
  `industryType` VARCHAR(64) NULL,
  `companySize` VARCHAR(32) NULL,
  `userId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `lms_organization_identificationNumber_key` (`identificationNumber`),
  UNIQUE INDEX `lms_organization_workEmail_key` (`workEmail`),
  INDEX `lms_organization_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend certificates for organisation holder type (run each line; skip if column already exists)
-- ALTER TABLE `lms_certificate` ADD COLUMN `holderType` VARCHAR(32) NOT NULL DEFAULT 'individual';
-- ALTER TABLE `lms_certificate` ADD COLUMN `organizationId` VARCHAR(191) NULL;
-- CREATE INDEX `lms_certificate_organizationId_idx` ON `lms_certificate` (`organizationId`);

-- View organisations in Workbench:
-- SELECT identificationNumber, companyName, workEmail FROM lms_organization ORDER BY identificationNumber;
