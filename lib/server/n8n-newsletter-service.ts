import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { buildN8nWebhookHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";
import { N8N_WEBHOOK_PATHS, resolveN8nWebhookUrlFromEnv } from "@/lib/server/n8n-webhook-url";

export type N8nNewsletterInput = {
  email: string;
  pagePath?: string;
};

function newsletterWebhookUrl(): string | null {
  const url = resolveN8nWebhookUrlFromEnv(
    "N8N_NEWSLETTER_WEBHOOK_URL",
    N8N_WEBHOOK_PATHS.newsletter,
  );
  return url.trim() || null;
}

export function isNewsletterViaN8n(): boolean {
  return Boolean(newsletterWebhookUrl());
}

/** POST newsletter signup to n8n (welcome / list / CRM workflow). */
export async function sendNewsletterViaN8n(
  input: N8nNewsletterInput,
): Promise<{ ok: boolean; message?: string }> {
  const url = newsletterWebhookUrl();
  if (!url) {
    return { ok: false, message: "N8N_NEWSLETTER_WEBHOOK_URL is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  const pagePath = input.pagePath?.trim() || "/";
  const appUrl = emailAppUrl().replace(/\/$/, "");

  const payload = {
    event: "newsletter_subscribe",
    source: "lms",
    email,
    pagePath,
    subscribedAt: new Date().toISOString(),
    brand: {
      appName: emailAppName(),
      appUrl,
    },
    links: {
      home: appUrl,
      courses: `${appUrl}/courses`,
      unsubscribe: `${appUrl}/contact`,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[newsletter] n8n webhook ${res.status} for ${email}: ${body.slice(0, 200)}. ${n8nWebhookAuthHint()}`,
      );
      return { ok: false, message: `n8n returned ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.warn("[newsletter] n8n webhook failed:", err);
    return { ok: false, message: err instanceof Error ? err.message : "n8n request failed" };
  }
}
