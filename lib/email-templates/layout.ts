/** Shared SF Trainings transactional email chrome (table-based for Gmail/Outlook). */

export const EMAIL_BRAND = {
  gold: "#eb9422",
  goldLight: "#f9b14d",
  goldDark: "#c97810",
  ink: "#0a0a0a",
  inkSoft: "#141414",
  inkMuted: "#1f1f1f",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textBody: "#3f3f46",
  border: "#27272a",
  white: "#ffffff",
  surface: "#fafafa",
} as const;

export type EmailLayoutInput = {
  appName: string;
  appUrl: string;
  /** Short line shown in inbox preview (hidden in body). */
  preheader: string;
  /** Inner HTML for the white content card. */
  bodyHtml: string;
  /** Optional absolute URL for logo image (e.g. NEXT_PUBLIC_APP_URL/logo.png). */
  logoUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoBlock(appName: string, logoUrl?: string): string {
  if (logoUrl?.trim()) {
    return `
      <img src="${escapeHtml(logoUrl.trim())}" alt="${escapeHtml(appName)}" width="140" height="auto"
        style="display:block;margin:0 auto 20px;max-width:140px;height:auto;border:0" />
    `;
  }
  const initials = appName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px">
      <tr>
        <td align="center" style="width:56px;height:56px;border-radius:14px;
          background:linear-gradient(145deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});
          font-size:22px;font-weight:800;color:${EMAIL_BRAND.ink};line-height:56px;text-align:center">
          ${escapeHtml(initials || "SF")}
        </td>
      </tr>
    </table>
  `;
}

export function wrapEmailLayout(input: EmailLayoutInput): string {
  const appName = input.appName.trim() || "SF Trainings";
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
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 520px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .btn-stack td { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
      .btn-stack a { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.surface};font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BRAND.surface}">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table role="presentation" class="email-shell" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
          <!-- Hero -->
          <tr>
            <td style="background:${EMAIL_BRAND.ink};border-radius:20px 20px 0 0;padding:0;overflow:hidden">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${EMAIL_BRAND.goldDark},${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold})"></td>
                </tr>
                <tr>
                  <td class="email-pad" align="center" style="padding:36px 32px 28px">
                    ${logoBlock(appName, input.logoUrl)}
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_BRAND.goldLight}">Sustainable Futures Training</p>
                    <h1 style="margin:10px 0 0;font-size:28px;font-weight:700;line-height:1.2;color:${EMAIL_BRAND.text}">${escapeHtml(appName)}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background:${EMAIL_BRAND.white};padding:0;border-left:1px solid ${EMAIL_BRAND.border};border-right:1px solid ${EMAIL_BRAND.border}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-pad" style="padding:36px 32px 32px">
                    ${input.bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:${EMAIL_BRAND.inkSoft};border-radius:0 0 20px 20px;border:1px solid ${EMAIL_BRAND.border};border-top:none">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-pad" align="center" style="padding:24px 32px 28px">
                    <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted}">
                      <a href="${escapeHtml(coursesUrl)}" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:600">Courses</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${escapeHtml(base)}/my-learning" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:600">My Learning</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${escapeHtml(contactUrl)}" style="color:${EMAIL_BRAND.goldLight};text-decoration:none;font-weight:600">Contact</a>
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.5;color:#71717a">
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
    return `<a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:linear-gradient(180deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});color:${EMAIL_BRAND.ink};font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 2px 8px rgba(235,148,34,0.35)">${safeLabel}</a>`;
  }
  return `<a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:${EMAIL_BRAND.ink};color:${EMAIL_BRAND.text};font-size:15px;font-weight:600;text-decoration:none;border-radius:10px">${safeLabel}</a>`;
}

export function emailInfoCard(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (row) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#71717a;width:38%">${escapeHtml(row.label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;font-weight:600;color:#18181b">${escapeHtml(row.value)}</td>
    </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:${EMAIL_BRAND.surface};border-radius:12px;border:1px solid #e4e4e7">
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
        <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(145deg,${EMAIL_BRAND.goldLight},${EMAIL_BRAND.gold});color:${EMAIL_BRAND.ink};font-size:13px;font-weight:800;line-height:28px;text-align:center">${i + 1}</div>
      </td>
      <td style="padding:0 0 16px 12px;vertical-align:top">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#18181b">${escapeHtml(step.title)}</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#52525b">${escapeHtml(step.detail)}</p>
      </td>
    </tr>`,
    )
    .join("");
}

export { escapeHtml };
