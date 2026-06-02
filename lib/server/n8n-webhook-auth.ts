/**
 * Headers for outbound POSTs to n8n webhooks (welcome, certificate, chat).
 *
 * .env.local:
 *   N8N_WEBHOOK_USER=your_username
 *   N8N_WEBHOOK_PASSWORD=your_password
 *   N8N_WEBHOOK_SECRET=optional-shared-secret   (header X-Webhook-Secret)
 */

export function isN8nWebhookBasicAuthConfigured(): boolean {
  return Boolean(
    process.env.N8N_WEBHOOK_USER?.trim() && process.env.N8N_WEBHOOK_PASSWORD?.trim(),
  );
}

/** JSON POST headers: Basic Auth + optional secret header. */
export function buildN8nWebhookHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const user = process.env.N8N_WEBHOOK_USER?.trim();
  const password = process.env.N8N_WEBHOOK_PASSWORD ?? "";
  if (user && password) {
    const encoded = Buffer.from(`${user}:${password}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${encoded}`;
  }

  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers["X-Webhook-Secret"] = secret;
  }

  return headers;
}
