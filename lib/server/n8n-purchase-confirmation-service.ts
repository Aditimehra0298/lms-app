import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { buildN8nWebhookHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";
import { getTutorLedProgramBySlug } from "@/lib/server/tutor-led-catalog";

export type PurchaseDeliveryKind = "tutor-led" | "self-paced";

export type PurchaseConfirmationN8nInput = {
  email: string;
  learnerName?: string | null;
  courseName: string;
  courseSlug?: string;
  deliveryKind: PurchaseDeliveryKind;
};

const DEFAULT_TUTOR_LED_PURCHASE_WEBHOOK_URL =
  "https://damnart-ai-guladab.n8n-wsk.com/webhook/purchased(tutor%20led)";
const DEFAULT_SELF_PACED_PURCHASE_WEBHOOK_URL =
  "https://damnart-ai-guladab.n8n-wsk.com/webhook/payment-confirmation(self-based)";

function tutorLedPurchaseWebhookUrl(): string | null {
  return (
    process.env.N8N_TUTOR_LED_PURCHASE_WEBHOOK_URL?.trim() ||
    DEFAULT_TUTOR_LED_PURCHASE_WEBHOOK_URL
  );
}

function selfPacedPurchaseWebhookUrl(): string | null {
  return (
    process.env.N8N_SELF_PACED_PURCHASE_WEBHOOK_URL?.trim() ||
    DEFAULT_SELF_PACED_PURCHASE_WEBHOOK_URL
  );
}

export function isTutorLedPurchaseEmailViaN8n(): boolean {
  return Boolean(tutorLedPurchaseWebhookUrl());
}

export function isSelfPacedPurchaseEmailViaN8n(): boolean {
  return Boolean(selfPacedPurchaseWebhookUrl());
}

function purchaseEmailsEnabled(): boolean {
  return process.env.PURCHASE_CONFIRMATION_EMAIL_ENABLED !== "false";
}

/** Published tutor-led / workshop slug → tutor-led; catalog e-learning → self-paced. */
export async function resolvePurchaseDeliveryKind(
  courseSlug: string,
): Promise<PurchaseDeliveryKind> {
  const program = await getTutorLedProgramBySlug(courseSlug);
  if (program && program.published !== false) return "tutor-led";
  return "self-paced";
}

function buildTutorLedPayload(input: PurchaseConfirmationN8nInput) {
  const email = input.email.trim().toLowerCase();
  const learnerName = input.learnerName?.trim() || email.split("@")[0];
  const courseName = input.courseName.trim();
  const appName = emailAppName();
  const appUrl = emailAppUrl().replace(/\/$/, "");

  return {
    email,
    learnerName,
    courseName,
    deliveryKind: "tutor-led" as const,
    event: "course.purchased",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! Your Tutor-Led Course Is Confirmed",
      previewText:
        "Your tutor-led course is confirmed. View your schedule and join live sessions from your dashboard.",
    },
    links: {
      dashboard: `${appUrl}/dashboard`,
    },
    brand: {
      appName,
      appUrl,
    },
  };
}

function buildSelfPacedPayload(input: PurchaseConfirmationN8nInput) {
  const email = input.email.trim().toLowerCase();
  const learnerName = input.learnerName?.trim() || email.split("@")[0];
  const courseName = input.courseName.trim();
  const appName = emailAppName();
  const appUrl = emailAppUrl().replace(/\/$/, "");

  return {
    email,
    learnerName,
    courseName,
    deliveryKind: "self-paced" as const,
    event: "course.purchased",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! Your Course Is Confirmed",
      previewText:
        "Your self-paced e-learning course is now available through your dashboard.",
    },
    links: {
      myLearning: `${appUrl}/my-learning`,
      exploreCourses: `${appUrl}/courses`,
      dashboard: `${appUrl}/dashboard`,
    },
    brand: {
      appName,
      appUrl,
    },
  };
}

async function postPurchaseWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string }> {
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
        message: `n8n purchase webhook returned ${res.status}. ${hint || authHint}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "n8n purchase request failed";
    return { ok: false, message };
  }
}

/** POST tutor-led purchase confirmation to n8n → email workflow. */
export async function sendTutorLedPurchaseConfirmationViaN8n(
  input: PurchaseConfirmationN8nInput,
): Promise<{ ok: boolean; message?: string }> {
  const url = tutorLedPurchaseWebhookUrl();
  if (!url) {
    return { ok: false, message: "N8N_TUTOR_LED_PURCHASE_WEBHOOK_URL is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, message: "Learner email is required." };
  if (!input.courseName.trim()) return { ok: false, message: "courseName is required." };

  return postPurchaseWebhook(url, buildTutorLedPayload(input));
}

/** POST self-paced purchase confirmation to n8n → email workflow. */
export async function sendSelfPacedPurchaseConfirmationViaN8n(
  input: PurchaseConfirmationN8nInput,
): Promise<{ ok: boolean; message?: string }> {
  const url = selfPacedPurchaseWebhookUrl();
  if (!url) {
    return { ok: false, message: "N8N_SELF_PACED_PURCHASE_WEBHOOK_URL is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, message: "Learner email is required." };
  if (!input.courseName.trim()) return { ok: false, message: "courseName is required." };

  return postPurchaseWebhook(url, buildSelfPacedPayload(input));
}

/** Resolve delivery kind and dispatch the matching n8n purchase email. */
export async function sendPurchaseConfirmationViaN8n(
  input: Omit<PurchaseConfirmationN8nInput, "deliveryKind"> & {
    deliveryKind?: PurchaseDeliveryKind;
  },
): Promise<{ ok: boolean; message?: string; deliveryKind: PurchaseDeliveryKind }> {
  const deliveryKind =
    input.deliveryKind ?? (await resolvePurchaseDeliveryKind(input.courseSlug ?? ""));

  const payload: PurchaseConfirmationN8nInput = {
    email: input.email,
    learnerName: input.learnerName,
    courseName: input.courseName,
    courseSlug: input.courseSlug,
    deliveryKind,
  };

  const result =
    deliveryKind === "tutor-led"
      ? await sendTutorLedPurchaseConfirmationViaN8n(payload)
      : await sendSelfPacedPurchaseConfirmationViaN8n(payload);

  return { ...result, deliveryKind };
}

export async function sendPurchaseConfirmationEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courses: { slug: string; title: string }[];
}): Promise<void> {
  if (!purchaseEmailsEnabled()) return;

  const email = input.learnerEmail.trim().toLowerCase();
  if (!email) return;

  for (const course of input.courses) {
    const courseName = course.title.trim() || course.slug;
    try {
      const result = await sendPurchaseConfirmationViaN8n({
        email,
        learnerName: input.learnerName,
        courseName,
        courseSlug: course.slug,
      });
      if (result.ok) {
        if (process.env.OTP_DEV_LOG === "true") {
          console.log(
            `[purchase-email] n8n sent (${result.deliveryKind}) for ${email} — ${courseName}`,
          );
        }
      } else {
        console.warn(
          `[purchase-email] n8n failed (${result.deliveryKind}) for ${email} — ${courseName}:`,
          result.message,
        );
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[purchase-email] failed for ${email} — ${courseName}:`, detail);
    }
  }
}

/** Fire-and-forget after checkout enrollments are saved to MySQL. */
export function queuePurchaseConfirmationEmails(input: {
  learnerEmail: string;
  learnerName?: string | null;
  courses: { slug: string; title: string }[];
}): void {
  if (!purchaseEmailsEnabled() || input.courses.length === 0) return;

  if (process.env.OTP_DEV_LOG === "true") {
    console.log(
      `[purchase-email] queued for ${input.learnerEmail} (${input.courses.length} course(s))`,
    );
  }

  void sendPurchaseConfirmationEmails(input).catch((err) => {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[purchase-email] batch failed for ${input.learnerEmail}:`, detail);
  });
}
