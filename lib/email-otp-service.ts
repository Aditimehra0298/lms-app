import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_SEND_WINDOW_MINUTES,
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
  devCode?: string;
  expiresInMinutes?: number;
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
  return purpose === "reset_password" ? "reset_password" : "register";
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

  await otpModel().create({
    data: {
      email,
      codeHash,
      purpose,
      expiresAt,
    },
  });

  try {
    const mail = await sendOtpEmail(email, code, mailKindForPurpose(purpose));
    const devMode = mail.devLogged;
    return {
      ok: true,
      devLogged: mail.devLogged,
      expiresInMinutes: 10,
      ...(devMode ? { devCode: code } : {}),
      message: devMode
        ? `Your code: ${code} (dev only — no email sent). Check terminal if needed.`
        : `Code sent to ${email}. Check inbox and spam.`,
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

export async function sendPasswordResetOtp(email: string): Promise<OtpSendResult> {
  return sendOtpForPurpose(email, "reset_password");
}

export async function verifyOtpForPurpose(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<{ ok: boolean; message?: string }> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
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
    return { ok: false, message: "No valid code found. Request a new code." };
  }

  if (isOtpExpired(record.expiresAt, now)) {
    return { ok: false, message: "Code expired. Request a new code." };
  }

  if (record.codeHash !== codeHash) {
    return { ok: false, message: "Incorrect code. Try again." };
  }

  await otpModel().update({
    where: { id: record.id },
    data: { verifiedAt: now },
  });

  if (purpose === "register") {
    await prisma.lmsUser.updateMany({
      where: { email },
      data: { emailVerifiedAt: now },
    });
  }

  return { ok: true, message: purpose === "reset_password" ? "Code verified." : "Email verified." };
}

export async function verifyRegistrationOtp(
  email: string,
  code: string,
): Promise<{ ok: boolean; message?: string }> {
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
