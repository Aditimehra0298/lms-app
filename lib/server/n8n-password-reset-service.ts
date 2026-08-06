import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { passwordResetExpiryHours } from "@/lib/password-reset-token";
import { postSftN8nEmailWebhook } from "@/lib/server/n8n-sft-email-service";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";

function passwordResetEmailEnabled(): boolean {
  return process.env.PASSWORD_RESET_EMAIL_ENABLED !== "false";
}

function passwordResetWebhookUrl(): string {
  return resolveN8nWebhookUrlFromEnv(
    "N8N_PASSWORD_RESET_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.passwordReset,
  );
}

function brandBlock() {
  const appName = emailAppName();
  const brandUrl = (
    process.env.MAIL_BRAND_URL?.trim() ||
    "https://www.sftrainings.org"
  ).replace(/\/$/, "");
  const lmsUrl = emailAppUrl().replace(/\/$/, "");
  /** Public host for the reset page — LMS by default so the link works. */
  const resetBase = (
    process.env.PASSWORD_RESET_BASE_URL?.trim() ||
    lmsUrl ||
    brandUrl
  ).replace(/\/$/, "");
  return {
    brandUrl,
    resetBase,
    brand: { appName, appUrl: brandUrl },
  };
}

export function buildPasswordResetPayload(input: {
  email: string;
  learnerName?: string | null;
  resetToken: string;
  resetLink?: string;
}) {
  const email = normalizeLearnerEmail(input.email);
  const { brand, resetBase } = brandBlock();
  const token = input.resetToken.trim();
  const resetLink =
    input.resetLink?.trim() ||
    `${resetBase}/reset-password?token=${encodeURIComponent(token)}`;

  return {
    email,
    learnerName:
      input.learnerName?.trim() ||
      email.split("@")[0] ||
      "Learner",
    resetToken: token,
    resetExpiryHours: passwordResetExpiryHours(),
    event: "password.reset",
    source: "LMS",
    deliveryKind: "auth",
    emailContent: {
      subject: "Reset Your Password",
      previewText:
        "We received a request to reset your password. Click the button below to set a new password and regain access to your account.",
    },
    links: {
      reset: resetLink,
      support: "mailto:info@sftrainings.org",
    },
    brand,
  };
}

async function postWithOneRetry(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string }> {
  const url = passwordResetWebhookUrl();
  const first = await postSftN8nEmailWebhook(url, payload, "password-reset");
  if (first.ok) return first;
  console.warn("[password-reset] first attempt failed, retrying once:", first.message);
  await new Promise((r) => setTimeout(r, 600));
  return postSftN8nEmailWebhook(url, payload, "password-reset");
}

/** Awaitable password-reset email via n8n (retry once). */
export async function sendPasswordResetEmailViaN8n(input: {
  email: string;
  learnerName?: string | null;
  resetToken: string;
  resetLink?: string;
}): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  if (!passwordResetEmailEnabled()) return { ok: true, skipped: true };

  const email = normalizeLearnerEmail(input.email);
  if (!email) return { ok: false, message: "email is required" };
  if (!input.resetToken.trim()) return { ok: false, message: "resetToken is required" };

  const payload = buildPasswordResetPayload({
    email,
    learnerName: input.learnerName,
    resetToken: input.resetToken,
    resetLink: input.resetLink,
  });

  return postWithOneRetry(payload);
}

/** Fire-and-forget — never blocks the learner UI. */
export function notifyPasswordResetEmail(input: {
  email: string;
  learnerName?: string | null;
  resetToken: string;
  resetLink?: string;
}): void {
  void sendPasswordResetEmailViaN8n(input).catch((err) => {
    console.error("[password-reset] failed:", err);
  });
}
