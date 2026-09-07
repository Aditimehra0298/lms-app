-- Block learner accounts from Admin → Users (optional; also applied via db push).
ALTER TABLE `lms_user` ADD COLUMN `blockedAt` DATETIME(3) NULL;
