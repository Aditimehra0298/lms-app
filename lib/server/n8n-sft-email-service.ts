import { buildN8nWebhookHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";

export type SftN8nEmailType =
  | "tutor-led-purchase"
  | "self-paced-purchase"
  | "meeting-reminder"
  | "course-completion"
  | "course-feedback";

export type PostSftN8nEmailResult = { ok: true } | { ok: false; message: string };

/** Fire-and-forget POST JSON to an n8n transactional email webhook (backend only). */
export async function postSftN8nEmailWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  label: SftN8nEmailType,
): Promise<PostSftN8nEmailResult> {
  const url = webhookUrl.trim();
  if (!url) {
    return { ok: false, message: `${label} webhook URL is not configured.` };
  }

  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { ok: false, message: "email is required for n8n webhooks." };
  }

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
      const message = `n8n ${label} webhook returned ${res.status}. ${hint || authHint}`;
      console.warn(`[n8n-email:${label}]`, message);
      return { ok: false, message };
    }

    if (process.env.OTP_DEV_LOG === "true") {
      console.log(`[n8n-email:${label}] sent → ${email}`);
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : `n8n ${label} request failed`;
    console.error(`[n8n-email:${label}]`, message);
    return { ok: false, message };
  }
}

export function queueSftN8nEmailWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  label: SftN8nEmailType,
): void {
  void postSftN8nEmailWebhook(webhookUrl, payload, label).catch((err) => {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[n8n-email:${label}] unhandled:`, detail);
  });
}
