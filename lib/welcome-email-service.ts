import type { AccountTypeId } from "@/lib/auth-profile";
import { emailAppName, emailAppUrl, emailLogoSrc, emailShortBrand } from "@/lib/email-brand-config";
import { buildWelcomeEmail, type WelcomeEmailMethod } from "@/lib/email-templates/welcome";
import { sendTransactionalEmail } from "@/lib/mail";
import {
  isWelcomeEmailViaN8n,
  sendWelcomeEmailViaN8n,
} from "@/lib/server/n8n-welcome-email-service";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";
import { isAdminEmail } from "@/lib/server/admin-emails";

export type WelcomeEmailInput = {
  email: string;
  learnerName?: string | null;
  method: WelcomeEmailMethod;
  accountType?: AccountTypeId | null;
};

function welcomeEmailsEnabled(): boolean {
  return process.env.WELCOME_EMAIL_ENABLED !== "false";
}

function smtpFallbackEnabled(): boolean {
  return process.env.WELCOME_EMAIL_SMTP_FALLBACK !== "false";
}

/**
 * After MySQL registration: load learner row, then send welcome (n8n or SMTP).
 * Called only for new learners — not on every login.
 */
export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email || !welcomeEmailsEnabled() || isAdminEmail(email)) return;

  const registration = await lookupRegistrationByEmail(email).catch(() => null);
  const learnerName =
    input.learnerName?.trim() ||
    registration?.name?.trim() ||
    null;

  if (isWelcomeEmailViaN8n()) {
    const n8n = await sendWelcomeEmailViaN8n({
      ...input,
      email,
      learnerName,
      registration,
    });
    if (n8n.ok) {
      if (process.env.OTP_DEV_LOG === "true") {
        console.log(`[welcome-email] n8n sent for ${email} (MySQL → n8n)`);
      }
      return;
    }
    console.warn(`[welcome-email] n8n failed for ${email}:`, n8n.message);
    if (!smtpFallbackEnabled()) return;
  }

  const { subject, text, html } = buildWelcomeEmail({
    email,
    learnerName,
    method: input.method,
    appUrl: emailAppUrl(),
    appName: emailAppName(),
    shortBrand: emailShortBrand(),
    logoUrl: emailLogoSrc(),
    registration,
  });

  const result = await sendTransactionalEmail({ to: email, subject, text, html });
  if (result.devLogged) {
    console.log(`[welcome-email] ${email} — dev log (SMTP off)`);
  }
}

/** Fire-and-forget after auth API saved user to MySQL. */
export function queueWelcomeEmail(input: WelcomeEmailInput): void {
  if (process.env.OTP_DEV_LOG === "true") {
    console.log(`[welcome-email] queued for ${input.email} (${input.method})`);
  }
  void sendWelcomeEmail(input).catch((err) => {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[welcome-email] failed for ${input.email}:`, detail);
  });
}
