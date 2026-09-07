-- Exclusive admin session (one device at a time)
CREATE TABLE IF NOT EXISTS `lms_admin_active_session` (
  `id` VARCHAR(32) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `sid` VARCHAR(128) NOT NULL,
  `createdAt` INT NOT NULL,
  `exp` INT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
