import { createHash, randomBytes } from "crypto";

/** Must match n8n `resetExpiryHours` and token row TTL. Keep short to limit abuse window. */
export const PASSWORD_RESET_TTL_HOURS = 1;

/** Stored in `lms_email_otp.purpose` (SHA-256 of the opaque link token). */
export const PASSWORD_RESET_LINK_PURPOSE = "password_reset_link";

export const PASSWORD_RESET_MAX_SENDS_PER_WINDOW = 3;
export const PASSWORD_RESET_SEND_WINDOW_MINUTES = 15;

/** Per-IP forgot-password/send attempts. */
export const PASSWORD_RESET_MAX_IP_SENDS = 8;
export const PASSWORD_RESET_IP_SEND_WINDOW_MINUTES = 15;
/** Minimum gap between send requests for the same email. */
export const PASSWORD_RESET_MIN_SEND_GAP_MS = 60_000;

/** Per-IP reset attempts (failed or successful probes). */
export const PASSWORD_RESET_MAX_IP_RESETS = 20;
export const PASSWORD_RESET_IP_RESET_WINDOW_MINUTES = 15;
/** Per-email failed reset probes (wrong/missing token). */
export const PASSWORD_RESET_MAX_EMAIL_RESET_FAILURES = 10;
export const PASSWORD_RESET_EMAIL_RESET_WINDOW_MINUTES = 15;
export const PASSWORD_RESET_MIN_RESET_GAP_MS = 800;

export function passwordResetExpiryHours(): number {
  const raw = Number(process.env.PASSWORD_RESET_TTL_HOURS ?? PASSWORD_RESET_TTL_HOURS);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 24) : PASSWORD_RESET_TTL_HOURS;
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
