import { normalizeLearnerEmail } from "@/lib/learner-email";
import {
  PASSWORD_RESET_LINK_PURPOSE,
  PASSWORD_RESET_MAX_SENDS_PER_WINDOW,
  PASSWORD_RESET_SEND_WINDOW_MINUTES,
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "@/lib/password-reset-token";
import { notifyPasswordResetEmail } from "@/lib/server/n8n-password-reset-service";
import { prisma } from "@/lib/prisma";

function otpModel() {
  if (!prisma.lmsEmailOtp) {
    throw new Error(
      "Prisma client missing lmsEmailOtp. Run: npm run db:generate — then restart npm run dev",
    );
  }
  return prisma.lmsEmailOtp;
}

export type PasswordResetRequestResult = {
  ok: boolean;
  message?: string;
  /** Always false for callers that must not reveal account existence. */
  sent?: boolean;
};

/**
 * Create a one-time reset token and fire the n8n password-reset webhook.
 * Safe to call for unknown emails — returns a generic success message.
 */
export async function requestPasswordResetEmail(input: {
  email: string;
  /** When true, skip the "user must exist" check (admin already validated). */
  requireExistingUser?: boolean;
  learnerName?: string | null;
}): Promise<PasswordResetRequestResult> {
  const email = normalizeLearnerEmail(input.email);
  const genericOk =
    "If an account exists for this email, a password reset link has been sent. Check your inbox and spam.";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Valid email is required." };
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!user) {
    if (input.requireExistingUser) {
      return { ok: false, message: "No account found for this email." };
    }
    return { ok: true, message: genericOk, sent: false };
  }

  const since = new Date(Date.now() - PASSWORD_RESET_SEND_WINDOW_MINUTES * 60 * 1000);
  const recent = await otpModel().count({
    where: {
      email,
      purpose: PASSWORD_RESET_LINK_PURPOSE,
      createdAt: { gte: since },
    },
  });
  if (recent >= PASSWORD_RESET_MAX_SENDS_PER_WINDOW) {
    return {
      ok: false,
      message: `Too many reset emails sent. Wait ${PASSWORD_RESET_SEND_WINDOW_MINUTES} minutes and try again.`,
    };
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = passwordResetExpiresAt();

  await otpModel().create({
    data: {
      email,
      codeHash: tokenHash,
      purpose: PASSWORD_RESET_LINK_PURPOSE,
      expiresAt,
    },
  });

  // Fire-and-forget so the forgot-password UI never waits on n8n.
  notifyPasswordResetEmail({
    email,
    learnerName: input.learnerName?.trim() || user.name,
    resetToken: token,
  });

  return { ok: true, message: genericOk, sent: true };
}

export async function consumePasswordResetToken(input: {
  token: string;
}): Promise<{ ok: boolean; email?: string; message?: string }> {
  const token = input.token.trim();
  if (!token || token.length < 32) {
    return { ok: false, message: "Invalid or expired reset link." };
  }

  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  const record = await otpModel().findFirst({
    where: {
      purpose: PASSWORD_RESET_LINK_PURPOSE,
      codeHash: tokenHash,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, message: "Invalid or expired reset link. Request a new one." };
  }

  await otpModel().update({
    where: { id: record.id },
    data: { verifiedAt: now },
  });

  // Invalidate any other unused link tokens for this email.
  await otpModel().updateMany({
    where: {
      email: record.email,
      purpose: PASSWORD_RESET_LINK_PURPOSE,
      verifiedAt: null,
      id: { not: record.id },
    },
    data: { verifiedAt: now },
  });

  return { ok: true, email: record.email };
}
