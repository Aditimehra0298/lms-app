import { sendTransactionalEmail } from "@/lib/mail";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { emailAppUrl } from "@/lib/email-brand-config";

const DEFAULT_ACTIVITY_RECIPIENTS = [
  "hip.spskpal@gmail.com",
  "bdm@sftrainings.org",
] as const;

/**
 * Inboxes that receive admin alerts for learner/user activity.
 * Override with ADMIN_ACTIVITY_EMAILS=a@x.com,b@y.com
 */
export function getAdminActivityRecipients(): string[] {
  const raw = process.env.ADMIN_ACTIVITY_EMAILS?.trim();
  if (raw) {
    const list = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.length > 0) return [...new Set(list)];
  }
  return [...DEFAULT_ACTIVITY_RECIPIENTS];
}

export type AdminActivityKind =
  | "registration"
  | "purchase"
  | "contact"
  | "book-a-call"
  | "enrollment-inquiry"
  | "support-ticket"
  | "other";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fire-and-forget SMTP alert to activity recipients.
 * Never throws to callers — logs failures only.
 */
export async function notifyAdminActivity(input: {
  kind: AdminActivityKind;
  subject: string;
  title: string;
  detail: string;
  lines?: Record<string, string | number | null | undefined>;
}): Promise<void> {
  const recipients = getAdminActivityRecipients();
  if (recipients.length === 0) return;

  const when = new Date().toISOString();
  const appUrl = emailAppUrl();
  const rows = Object.entries(input.lines ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim() !== "",
  );

  const textLines = [
    `${COMPANY_DISPLAY_NAME} — Admin activity alert`,
    "",
    input.title,
    input.detail,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Kind: ${input.kind}`,
    `Time: ${when}`,
    appUrl ? `Site: ${appUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px;color:#0f172a;">${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">${escapeHtml(COMPANY_DISPLAY_NAME)} · Admin</p>
    <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(input.title)}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">${escapeHtml(input.detail)}</p>
    ${htmlRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${htmlRows}</table>` : ""}
    <p style="margin:0;font-size:12px;color:#94a3b8;">${escapeHtml(input.kind)} · ${escapeHtml(when)}</p>
  </div></body></html>`;

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendTransactionalEmail({
          to,
          subject: input.subject,
          text: textLines,
          html,
        });
      } catch (err) {
        console.error(`[admin-activity-email] failed → ${to}`, err);
      }
    }),
  );
}

/** Non-blocking wrapper for route handlers. */
export function queueAdminActivityEmail(
  input: Parameters<typeof notifyAdminActivity>[0],
): void {
  void notifyAdminActivity(input).catch((err) => {
    console.error("[admin-activity-email] queue failed", err);
  });
}
