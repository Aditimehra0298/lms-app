/** Shared SF Trainings transactional email chrome (table-based for Gmail/Outlook). */

export const EMAIL_BRAND = {
  gold: "#eb9422",
  goldLight: "#f9b14d",
  goldDark: "#c97810",
  greenDark: "#0c3320",
  green: "#14532d",
  greenMid: "#166534",
  greenLight: "#22c55e",
  greenSoft: "#dcfce7",
  cream: "#f7faf7",
  creamDeep: "#eef6ef",
  ink: "#0c3320",
  text: "#ffffff",
  textMuted: "#c8e6d0",
  textBody: "#374151",
  border: "#86efac",
  borderSoft: "#d1e7d6",
  white: "#ffffff",
  surface: "#f4faf5",
} as const;

import { DEFAULT_EMAIL_APP_NAME, emailTagline } from "@/lib/email-brand-config";

export type EmailLayoutInput = {
  appName: string;
  appUrl: string;
  preheader: string;
  bodyHtml: string;
  /** HTTPS URL or embedded data URI for the logo image. */
  logoSrc?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoBlock(appName: string, logoSrc?: string): string {
  if (logoSrc?.trim()) {
    return `
      <img src="${logoSrc.trim()}" alt="${escapeHtml(appName)}" width="340"
        style="display:block;margin:0 auto 16px;max-width:340px;width:100%;height:auto;border:0;outline:none;text-decoration:none" />
    `;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px">
      <tr>
        <td align="center" style="width:72px;height:72px;border-radius:18px;
          background:linear-gradient(145deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});
          font-size:26px;font-weight:800;color:${EMAIL_BRAND.ink};line-height:72px;text-align:center;
          box-shadow:0 8px 24px rgba(235,148,34,0.35)">
          SFT
        </td>
      </tr>
    </table>
  `;
}

export function wrapEmailLayout(input: EmailLayoutInput): string {
  const appName = input.appName.trim() || DEFAULT_EMAIL_APP_NAME;
  const tagline = emailTagline();
  const hasWordmark = Boolean(input.logoSrc?.trim());
  const base = input.appUrl.replace(/\/$/, "");
  const year = new Date().getFullYear();
  const preheader = escapeHtml(input.preheader);
  const coursesUrl = `${base}/courses`;
  const contactUrl = `${base}/contact`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(appName)}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .brand-title { font-size: 22px !important; }
      .btn-stack td { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
      .btn-stack a { display: block !important; text-align: center !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 0.2em !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.cream};font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:linear-gradient(180deg,${EMAIL_BRAND.cream} 0%,${EMAIL_BRAND.creamDeep} 100%)">
    <tr>
      <td align="center" style="padding:36px 16px 44px">
        <table role="presentation" class="email-shell" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
          <tr>
            <td style="background:linear-gradient(165deg,${EMAIL_BRAND.greenMid} 0%,${EMAIL_BRAND.green} 52%,${EMAIL_BRAND.greenDark} 100%);
              border-radius:22px 22px 0 0;overflow:hidden;box-shadow:0 12px 40px rgba(12,51,32,0.2)">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:5px;background:linear-gradient(90deg,${EMAIL_BRAND.goldDark},${EMAIL_BRAND.goldLight},${EMAIL_BRAND.greenLight},${EMAIL_BRAND.gold})"></td>
                </tr>
                <tr>
                  <td class="email-pad" align="center" style="padding:32px 32px 26px">
                    ${logoBlock(appName, input.logoSrc)}
                    ${
                      hasWordmark
                        ? `<p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:1.5;color:${EMAIL_BRAND.goldLight}">${escapeHtml(tagline)}</p>`
                        : `<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_BRAND.goldLight}">${escapeHtml(tagline)}</p>
                    <h1 class="brand-title" style="margin:0;font-size:26px;font-weight:800;line-height:1.25;color:${EMAIL_BRAND.text};text-shadow:0 2px 12px rgba(0,0,0,0.2)">${escapeHtml(appName)}</h1>`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_BRAND.white};border-left:1px solid ${EMAIL_BRAND.borderSoft};border-right:1px solid ${EMAIL_BRAND.borderSoft}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-pad" style="padding:38px 36px 34px">${input.bodyHtml}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(180deg,${EMAIL_BRAND.green} 0%,${EMAIL_BRAND.greenDark} 100%);
              border-radius:0 0 22px 22px;border:1px solid ${EMAIL_BRAND.greenDark};border-top:none">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-pad" align="center" style="padding:26px 36px 30px">
                    <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted}">
                      <a href="${escapeHtml(coursesUrl)}" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:700">Courses</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${escapeHtml(base)}/my-learning" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:700">My Learning</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${escapeHtml(contactUrl)}" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:700">Contact</a>
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.55;color:#9fd4b0">
                      Sustainable learning · Trusted accreditation · Secure platform
                    </p>
                    <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#7fb896">
                      © ${year} ${escapeHtml(appName)}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function emailButton(href: string, label: string, variant: "primary" | "secondary" = "primary"): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  if (variant === "primary") {
    return `<a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:linear-gradient(180deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});color:${EMAIL_BRAND.ink};font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;box-shadow:0 4px 14px rgba(235,148,34,0.38)">${safeLabel}</a>`;
  }
  return `<a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:linear-gradient(180deg,${EMAIL_BRAND.greenMid},${EMAIL_BRAND.green});color:${EMAIL_BRAND.text};font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;border:1px solid ${EMAIL_BRAND.goldDark}">${safeLabel}</a>`;
}

export function emailOtpCodeBlock(code: string, label = "Your verification code"): string {
  const safeCode = escapeHtml(code);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="border-radius:18px;overflow:hidden;border:2px solid ${EMAIL_BRAND.gold};
            box-shadow:0 8px 28px rgba(22,101,52,0.18),0 4px 16px rgba(235,148,34,0.2)">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,${EMAIL_BRAND.goldDark},${EMAIL_BRAND.goldLight},${EMAIL_BRAND.greenLight})"></td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 24px 28px;
                background:linear-gradient(180deg,${EMAIL_BRAND.greenMid} 0%,${EMAIL_BRAND.greenDark} 100%)">
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_BRAND.goldLight}">
                  ${safeLabel}
                </p>
                <p class="otp-code" style="margin:0;font-size:42px;font-weight:800;letter-spacing:0.32em;
                  color:${EMAIL_BRAND.goldLight};font-family:Consolas,Monaco,monospace;
                  text-shadow:0 0 24px rgba(249,177,77,0.5)">${safeCode}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function emailInfoCard(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (row) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${EMAIL_BRAND.borderSoft};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${EMAIL_BRAND.greenMid};width:38%">${escapeHtml(row.label)}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${EMAIL_BRAND.borderSoft};font-size:14px;font-weight:600;color:#1f2937">${escapeHtml(row.value)}</td>
    </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:0 0 28px;background:${EMAIL_BRAND.surface};border-radius:14px;border:1px solid ${EMAIL_BRAND.borderSoft}">
      ${cells}
    </table>
  `;
}

export function emailStepList(steps: Array<{ title: string; detail: string }>): string {
  return steps
    .map(
      (step, i) => `
    <tr>
      <td style="padding:0 0 16px 0;vertical-align:top;width:36px">
        <div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(145deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});color:${EMAIL_BRAND.ink};font-size:13px;font-weight:800;line-height:30px;text-align:center">${i + 1}</div>
      </td>
      <td style="padding:0 0 16px 12px;vertical-align:top">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1f2937">${escapeHtml(step.title)}</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.textBody}">${escapeHtml(step.detail)}</p>
      </td>
    </tr>`,
    )
    .join("");
}

export { escapeHtml };
