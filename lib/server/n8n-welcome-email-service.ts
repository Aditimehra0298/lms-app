import type { AccountTypeId } from "@/lib/auth-profile";
import {
  emailAppName,
  emailAppUrl,
  emailLogoSrc,
  emailShortBrand,
} from "@/lib/email-brand-config";
import { buildWelcomeEmail, type WelcomeEmailMethod } from "@/lib/email-templates/welcome";
import type { RegistrationLookupResult } from "@/lib/server/registration-lookup";
import { buildN8nWebhookHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";

export type N8nWelcomeEmailInput = {
  email: string;
  learnerName?: string | null;
  method: WelcomeEmailMethod;
  accountType?: AccountTypeId | null;
  /** MySQL learner row (already loaded). */
  registration?: RegistrationLookupResult | null;
};

function welcomeWebhookUrl(): string | null {
  return process.env.N8N_WELCOME_WEBHOOK_URL?.trim() || null;
}

export function isWelcomeEmailViaN8n(): boolean {
  return Boolean(welcomeWebhookUrl());
}

/** POST learner data from MySQL to n8n → Gmail sends welcome + dashboard + courses links. */
export async function sendWelcomeEmailViaN8n(
  input: N8nWelcomeEmailInput,
): Promise<{ ok: boolean; message?: string }> {
  const url = welcomeWebhookUrl();
  if (!url) {
    return { ok: false, message: "N8N_WELCOME_WEBHOOK_URL is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  const appName = emailAppName();
  const shortBrand = emailShortBrand();
  const appUrl = emailAppUrl().replace(/\/$/, "");
  const logoUrl = emailLogoSrc();
  const registration = input.registration ?? null;

  const learnerName =
    input.learnerName?.trim() ||
    registration?.name?.trim() ||
    email.split("@")[0];

  const { subject, text, html, dashboardUrl, exploreCoursesUrl } = buildWelcomeEmail({
    email,
    learnerName,
    method: input.method,
    appUrl,
    appName,
    shortBrand,
    logoUrl,
    registration,
  });

  const payload = {
    event: "learner_registered",
    source: "lms",
    email,
    learnerName,
    signUpMethod: input.method,
    accountType: input.accountType ?? registration?.accountType ?? "individual",
    /** Full row from MySQL `lms_user` (+ org codes when applicable). */
    mysql: registration,
    registration,
    brand: {
      appName,
      shortBrand,
      appUrl,
      logoUrl: logoUrl ?? null,
    },
    links: {
      dashboard: dashboardUrl,
      dashboardUrl,
      exploreCourses: exploreCoursesUrl,
      exploreCoursesUrl,
      myLearning: `${appUrl}/my-learning`,
      courses: exploreCoursesUrl,
      account: `${appUrl}/account`,
    },
    emailContent: {
      subject,
      text,
      html,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const hint = (await res.text()).slice(0, 300);
      const authHint =
        res.status === 401 || res.status === 403
          ? n8nWebhookAuthHint()
          : "Check workflow is active.";
      return {
        ok: false,
        message: `n8n welcome webhook returned ${res.status}. ${hint || authHint}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "n8n welcome request failed";
    return { ok: false, message };
  }
}
