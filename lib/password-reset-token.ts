import { createHash, randomBytes } from "crypto";

/** Must match n8n `resetExpiryHours` and token row TTL. */
export const PASSWORD_RESET_TTL_HOURS = 24;

/** Stored in `lms_email_otp.purpose` (SHA-256 of the opaque link token). */
export const PASSWORD_RESET_LINK_PURPOSE = "password_reset_link";

export const PASSWORD_RESET_MAX_SENDS_PER_WINDOW = 5;
export const PASSWORD_RESET_SEND_WINDOW_MINUTES = 15;

export function passwordResetExpiryHours(): number {
  const raw = Number(process.env.PASSWORD_RESET_TTL_HOURS ?? PASSWORD_RESET_TTL_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : PASSWORD_RESET_TTL_HOURS;
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function passwordResetExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + passwordResetExpiryHours() * 60 * 60 * 1000);
}
