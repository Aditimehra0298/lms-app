import { createHash, randomInt } from "crypto";

export const OTP_LENGTH = 6;
/** Short lifetime reduces brute-force window (remediation: ~5 min). */
export const OTP_TTL_MINUTES = 5;
export const OTP_VERIFIED_WINDOW_MINUTES = 30;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const OTP_SEND_WINDOW_MINUTES = 15;

/** Max wrong codes per OTP before the code is invalidated. */
export const OTP_MAX_VERIFY_ATTEMPTS = 5;
/** Per-email verify failures across codes in this window → temporary lockout. */
export const OTP_EMAIL_VERIFY_WINDOW_MINUTES = 15;
export const OTP_MAX_EMAIL_VERIFY_ATTEMPTS = 10;
/** Per-IP verify attempts in this window. */
export const OTP_IP_VERIFY_WINDOW_MINUTES = 15;
export const OTP_MAX_IP_VERIFY_ATTEMPTS = 30;
/** Per-IP OTP send attempts in this window (not spoofable via client XFF alone). */
export const OTP_IP_SEND_WINDOW_MINUTES = 15;
export const OTP_MAX_IP_SENDS = 20;
/** Minimum ms between verify attempts for the same email (slows Intruder). */
export const OTP_MIN_VERIFY_GAP_MS = 800;

export type OtpPurpose = "register" | "reset_password" | "admin_security";

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function otpExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function isOtpExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function verifiedWithinWindow(verifiedAt: Date, now = new Date()): boolean {
  const windowMs = OTP_VERIFIED_WINDOW_MINUTES * 60 * 1000;
  return now.getTime() - verifiedAt.getTime() <= windowMs;
}
