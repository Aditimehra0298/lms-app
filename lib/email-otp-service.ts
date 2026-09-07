import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_SEND_WINDOW_MINUTES,
  OTP_TTL_MINUTES,
  OTP_VERIFIED_WINDOW_MINUTES,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  otpExpiresAt,
  verifiedWithinWindow,
  type OtpPurpose,
} from "@/lib/email-otp";
import { sendOtpEmail, type OtpEmailKind } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export type OtpSendResult = {
  ok: boolean;
  message?: string;
  devLogged?: boolean;
  expiresInMinutes?: number;
};

export type OtpVerifyResult = {
  ok: boolean;
  message?: string;
  /** Hint for HTTP status: 429 when locked / rate-limited. */
  httpStatus?: number;
  remainingAttempts?: number;
};

function otpModel() {
  if (!prisma.lmsEmailOtp) {
    throw new Error(
      "Prisma client missing lmsEmailOtp. Run: npm run db:generate — then restart npm run dev",
    );
  }
  return prisma.lmsEmailOtp;
}

function mailKindForPurpose(purpose: OtpPurpose): OtpEmailKind {
  return purpose === "reset_password" || purpose === "admin_security" ? "reset_password" : "register";
}

export async function countRecentOtpSends(email: string, purpose: OtpPurpose): Promise<number> {
  const since = new Date(Date.now() - OTP_SEND_WINDOW_MINUTES * 60 * 1000);
  return otpModel().count({
    where: { email, purpose, createdAt: { gte: since } },
  });
}

export async function sendOtpForPurpose(email: string, purpose: OtpPurpose): Promise<OtpSendResult> {
  const sends = await countRecentOtpSends(email, purpose);
  if (sends >= OTP_MAX_SENDS_PER_WINDOW) {
    return {
      ok: false,
      message: `Too many codes sent. Wait ${OTP_SEND_WINDOW_MINUTES} minutes and try again.`,
    };
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = otpExpiresAt();

  // Invalidate older unused codes so only the latest is valid (shrinks brute window).
  await otpModel().updateMany({
    where: {
      email,
      purpose,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() },
  });

  await otpModel().create({
    data: {
      email,
      codeHash,
      purpose,
      expiresAt,
      attemptCount: 0,
    },
  });

  try {
    const mail = await sendOtpEmail(email, code, mailKindForPurpose(purpose));
    const devMode = mail.devLogged;
    return {
      ok: true,
      devLogged: mail.devLogged,
      expiresInMinutes: OTP_TTL_MINUTES,
      message: devMode
        ? "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local (see .env.example)."
        : `Code sent to ${email}. Check inbox and spam. Code expires in ${OTP_TTL_MINUTES} minutes.`,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to send email";
    return {
      ok: false,
      message:
        `Could not send email to ${email}. ` +
        `Check SMTP (Gmail app password, firewall port 587) and server logs. ${detail}`,
    };
  }
}

export async function sendRegistrationOtp(email: string): Promise<OtpSendResult> {
  return sendOtpForPurpose(email, "register");
}

export async function sendPasswordResetOtp(_email: string): Promise<OtpSendResult> {
  // POC-D-02: 6-digit password-reset OTPs are disabled. Use /api/auth/forgot-password/send (link token).
  return {
    ok: false,
    message: "Password reset codes are disabled. Use the forgot-password email link instead.",
  };
}

export async function sendAdminSecurityOtp(email: string): Promise<OtpSendResult> {
  return sendOtpForPurpose(email, "admin_security");
}

export async function verifyOtpForPurpose(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<OtpVerifyResult> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, message: "Enter the 6-digit code from your email.", httpStatus: 400 };
  }

  const codeHash = hashOtpCode(trimmed);
  const now = new Date();

  const record = await otpModel().findFirst({
    where: {
      email,
      purpose,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return {
      ok: false,
      message: "No valid code found. Request a new code.",
      httpStatus: 400,
    };
  }

  if (isOtpExpired(record.expiresAt, now)) {
    return { ok: false, message: "Code expired. Request a new code.", httpStatus: 400 };
  }

  const priorAttempts = Number(record.attemptCount ?? 0);
  if (priorAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    await otpModel().update({
      where: { id: record.id },
      data: { expiresAt: now },
    });
    return {
      ok: false,
      message: "Too many incorrect codes. Request a new code and try again later.",
      httpStatus: 429,
      remainingAttempts: 0,
    };
  }

  if (record.codeHash !== codeHash) {
    const updated = await otpModel().update({
      where: { id: record.id },
      data: { attemptCount: { increment: 1 } },
    });
    const attempts = Number(updated.attemptCount ?? priorAttempts + 1);
    const remaining = Math.max(0, OTP_MAX_VERIFY_ATTEMPTS - attempts);

    if (attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await otpModel().update({
        where: { id: record.id },
        data: { expiresAt: now },
      });
      return {
        ok: false,
        message: "Too many incorrect codes. This code is locked. Request a new code.",
        httpStatus: 429,
        remainingAttempts: 0,
      };
    }

    return {
      ok: false,
      message: `Incorrect code. Try again. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`,
      httpStatus: 400,
      remainingAttempts: remaining,
    };
  }

  await otpModel().update({
    where: { id: record.id },
    data: { verifiedAt: now },
  });

  // Burn any other open codes for this email/purpose.
  await otpModel().updateMany({
    where: {
      email,
      purpose,
      verifiedAt: null,
      id: { not: record.id },
      expiresAt: { gt: now },
    },
    data: { expiresAt: now },
  });

  if (purpose === "register") {
    await prisma.lmsUser.updateMany({
      where: { email },
      data: { emailVerifiedAt: now },
    });
  }

  return {
    ok: true,
    message: purpose === "reset_password" ? "Code verified." : "Email verified.",
  };
}

export async function verifyRegistrationOtp(
  email: string,
  code: string,
): Promise<OtpVerifyResult> {
  return verifyOtpForPurpose(email, code, "register");
}

export async function hasRecentOtpVerification(email: string, purpose: OtpPurpose): Promise<boolean> {
  const since = new Date(Date.now() - OTP_VERIFIED_WINDOW_MINUTES * 60 * 1000);
  const verified = await otpModel().findFirst({
    where: {
      email,
      purpose,
      verifiedAt: { gte: since },
    },
    orderBy: { verifiedAt: "desc" },
  });
  return Boolean(verified?.verifiedAt && verifiedWithinWindow(verified.verifiedAt));
}

export async function hasRecentEmailVerification(email: string): Promise<boolean> {
  return hasRecentOtpVerification(email, "register");
}

export async function hasRecentPasswordResetVerification(email: string): Promise<boolean> {
  return hasRecentOtpVerification(email, "reset_password");
}
