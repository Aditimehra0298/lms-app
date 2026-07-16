const DEFAULT_N8N_WEBHOOK_BASE = "https://damnart-ai-guladab.n8n-wsk.com/webhook/";

/** Base URL with trailing slash — e.g. https://…/webhook/ */
export function n8nWebhookBaseUrl(): string {
  const raw = process.env.N8N_WEBHOOK_BASE_URL?.trim() || DEFAULT_N8N_WEBHOOK_BASE;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/**
 * Build a full n8n webhook URL. Encodes path segments that contain spaces/parentheses.
 * @param pathSegment — e.g. `purchased(tutor led)` or `meeting-reminder`
 */
export function buildN8nWebhookUrl(pathSegment: string): string {
  const base = n8nWebhookBaseUrl();
  const segment = pathSegment.trim().replace(/^\/+/, "");
  if (!segment) return base.slice(0, -1);
  if (segment.startsWith("http://") || segment.startsWith("https://")) return segment;
  return `${base}${encodeURIComponent(segment)}`;
}

export const N8N_WEBHOOK_PATHS = {
  tutorLedPurchase: "purchased(tutor led)",
  selfPacedPurchase: "payment-confirmation(self-based)",
  meetingReminder: "meeting-reminder",
  courseCompletion: "course-completion",
  reviews: "reviews",
  newsletter: "newsletter",
} as const;

export function resolveN8nWebhookUrlFromEnv(
  envKey: string,
  defaultPath: string,
): string {
  const explicit = process.env[envKey]?.trim();
  if (explicit) return explicit;
  return buildN8nWebhookUrl(defaultPath);
}
