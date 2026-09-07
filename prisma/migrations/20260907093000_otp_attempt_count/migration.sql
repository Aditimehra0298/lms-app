-- OTP brute-force hardening: track failed verify attempts per code.
ALTER TABLE `lms_email_otp`
  ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 0;
