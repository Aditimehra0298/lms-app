-- Auto-set registration month/year when user signs up (run after db push or manually in Workbench)

ALTER TABLE `lms_user`
  ADD COLUMN `registrationMonth` INT NULL,
  ADD COLUMN `registrationYear` INT NULL,
  ADD COLUMN `registrationMonthYear` VARCHAR(7) NULL;

ALTER TABLE `lms_organization`
  ADD COLUMN `registrationMonth` INT NULL,
  ADD COLUMN `registrationYear` INT NULL,
  ADD COLUMN `registrationMonthYear` VARCHAR(7) NULL;
