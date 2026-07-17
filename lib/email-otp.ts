import { createHash, randomInt } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_VERIFIED_WINDOW_MINUTES = 30;
export const OTP_MAX_SENDS_PER_WINDOW = 5;
export const OTP_SEND_WINDOW_MINUTES = 15;

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
