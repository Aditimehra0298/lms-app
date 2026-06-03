/**
 * Headers for outbound POSTs to n8n webhooks (welcome, certificate, chat).
 *
 * .env.local — pick one auth mode:
 *
 * Basic Auth (n8n Webhook → Authentication → Basic Auth):
 *   N8N_WEBHOOK_AUTH_MODE=basic
 *   N8N_WEBHOOK_USER=your_username
 *   N8N_WEBHOOK_PASSWORD=your_password
 *
 * Header Auth (n8n Webhook → Authentication → Header Auth):
 *   N8N_WEBHOOK_AUTH_MODE=header
 *   N8N_WEBHOOK_HEADER_NAME=Authorization
 *   N8N_WEBHOOK_HEADER_VALUE=Bearer your-token
 *
 * Optional extra check in n8n:
 *   N8N_WEBHOOK_SECRET=shared-secret   (header X-Webhook-Secret)
 */

export type N8nWebhookAuthMode = "basic" | "header" | "none";

function readEnv(name: string): string {
  let value = process.env[name]?.trim() ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

export function n8nWebhookAuthMode(): N8nWebhookAuthMode {
  const raw = readEnv("N8N_WEBHOOK_AUTH_MODE").toLowerCase();
  if (raw === "none" || raw === "off" || raw === "false") return "none";
  if (raw === "header") return "header";
  if (raw === "basic") return "basic";
  if (readEnv("N8N_WEBHOOK_HEADER_NAME") && readEnv("N8N_WEBHOOK_HEADER_VALUE")) {
    return "header";
  }
  if (readEnv("N8N_WEBHOOK_USER") && readEnv("N8N_WEBHOOK_PASSWORD")) return "basic";
  return "none";
}

export function isN8nWebhookBasicAuthConfigured(): boolean {
  return n8nWebhookAuthMode() === "basic";
}

export function n8nWebhookAuthHint(): string {
  const mode = n8nWebhookAuthMode();
  if (mode === "basic") {
    return "Check N8N_WEBHOOK_USER and N8N_WEBHOOK_PASSWORD match n8n Webhook → Basic Auth exactly (case-sensitive).";
  }
  if (mode === "header") {
    return "Check N8N_WEBHOOK_HEADER_NAME and N8N_WEBHOOK_HEADER_VALUE match n8n Webhook → Header Auth.";
  }
  return "Set N8N_WEBHOOK_AUTH_MODE and credentials, or enable auth on the n8n Webhook node.";
}

/** JSON POST headers: Basic/Header Auth + optional secret header. */
export function buildN8nWebhookHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const mode = n8nWebhookAuthMode();
  if (mode === "basic") {
    const user = readEnv("N8N_WEBHOOK_USER");
    const password = readEnv("N8N_WEBHOOK_PASSWORD");
    if (user && password) {
      const encoded = Buffer.from(`${user}:${password}`, "utf8").toString("base64");
      headers.Authorization = `Basic ${encoded}`;
    }
  } else if (mode === "header") {
    const name = readEnv("N8N_WEBHOOK_HEADER_NAME");
    const value = readEnv("N8N_WEBHOOK_HEADER_VALUE");
    if (name && value) {
      headers[name] = value;
    }
  }

  const secret = readEnv("N8N_WEBHOOK_SECRET");
  if (secret) {
    headers["X-Webhook-Secret"] = secret;
  }

  return headers;
}
