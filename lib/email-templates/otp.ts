import {
  EMAIL_BRAND,
  escapeHtml,
  wrapEmailLayout,
  type EmailLayoutInput,
} from "@/lib/email-templates/layout";
export type OtpEmailKind = "register" | "reset_password";

export type OtpTemplateInput = {
  code: string;
  kind: OtpEmailKind;
  appName: string;
  appUrl: string;
  logoUrl?: string;
};

export function buildOtpEmail(input: OtpTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const appName = input.appName.trim() || "SF Trainings";
  const isReset = input.kind === "reset_password";
  const subject = isReset
    ? `Reset your ${appName} password`
    : `Verify your email — ${appName}`;
  const heading = isReset ? "Password reset" : "Verify your email";
  const intro = isReset
    ? "Enter this code on the password reset page. It expires in 10 minutes."
    : "Enter this code to finish creating your account. It expires in 10 minutes.";
  const preheader = isReset
    ? `Your password reset code is ${input.code}`
    : `Your verification code is ${input.code}`;

  const text = [
    `${heading} — ${appName}`,
    "",
    intro,
    "",
    `Code: ${input.code}`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    `— ${appName}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_BRAND.gold}">${escapeHtml(heading)}</p>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#18181b">${isReset ? "Reset your password" : "Confirm it's you"}</h2>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.textBody}">${escapeHtml(intro)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
      <tr>
        <td align="center" style="padding:28px 20px;background:linear-gradient(180deg,#fffbeb,#fff7ed);border-radius:16px;border:2px dashed ${EMAIL_BRAND.gold}">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#92400e">Your code</p>
          <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.35em;color:#18181b;font-family:Consolas,Monaco,monospace">${escapeHtml(input.code)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:14px 16px;background:${EMAIL_BRAND.surface};border-radius:10px;border:1px solid #e4e4e7">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#52525b">
            <strong style="color:#18181b">Expires in 10 minutes.</strong>
            Never share this code. ${appName} staff will never ask for it.
          </p>
        </td>
      </tr>
    </table>
  `;

  const layoutInput: EmailLayoutInput = {
    appName,
    appUrl: input.appUrl,
    logoUrl: input.logoUrl,
    preheader,
    bodyHtml,
  };

  return { subject, text, html: wrapEmailLayout(layoutInput) };
}
