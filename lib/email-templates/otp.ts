import {
  EMAIL_BRAND,
  emailOtpCodeBlock,
  escapeHtml,
  wrapEmailLayout,
  type EmailLayoutInput,
} from "@/lib/email-templates/layout";
import { DEFAULT_EMAIL_APP_NAME } from "@/lib/email-brand-config";
export type OtpEmailKind = "register" | "reset_password";

export type OtpTemplateInput = {
  code: string;
  kind: OtpEmailKind;
  appName: string;
  appUrl: string;
  logoSrc?: string;
};

export function buildOtpEmail(input: OtpTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const appName = input.appName.trim() || DEFAULT_EMAIL_APP_NAME;
  const isReset = input.kind === "reset_password";
  const subject = isReset
    ? `${appName} — Password reset verification code`
    : `${appName} — Email verification code`;
  const heading = isReset ? "Password reset" : "Email verification";
  const title = isReset
    ? "Reset your account password"
    : "Verify your email address";
  const intro = isReset
    ? `You requested a password reset for your ${appName} account. Enter the verification code below on the reset page. This code expires in 10 minutes.`
    : `Thank you for registering with ${appName}. Enter the verification code below to confirm your email address and complete your registration. This code expires in 10 minutes.`;
  const preheader = isReset
    ? `Your ${appName} password reset code is ${input.code}`
    : `Your ${appName} verification code is ${input.code}`;
  const codeLabel = isReset ? "Password reset code" : "Email verification code";

  const text = [
    appName,
    heading,
    "",
    intro,
    "",
    `Verification code: ${input.code}`,
    "",
    "If you did not request this email, you may safely ignore it.",
    "",
    `— ${appName}`,
  ].join("\n");

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="padding:12px 16px;background:linear-gradient(90deg,${EMAIL_BRAND.greenSoft},rgba(249,177,77,0.12));
          border-radius:12px;border-left:4px solid ${EMAIL_BRAND.greenMid}">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${EMAIL_BRAND.greenMid}">
            ${escapeHtml(heading)}
          </p>
        </td>
      </tr>
    </table>

    <h2 style="margin:0 0 12px;font-size:24px;font-weight:800;line-height:1.3;color:#1f2937">${escapeHtml(title)}</h2>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${EMAIL_BRAND.textBody}">${escapeHtml(intro)}</p>

    ${emailOtpCodeBlock(input.code, codeLabel)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 18px;background:${EMAIL_BRAND.surface};border-radius:12px;border:1px solid ${EMAIL_BRAND.borderSoft}">
          <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#4b5563">
            <strong style="color:#14532d">Expires in 10 minutes.</strong>
            Do not share this code with anyone.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.greenMid}">
            ${escapeHtml(appName)} will never ask you for this code by phone or message.
          </p>
        </td>
      </tr>
    </table>
  `;

  const layoutInput: EmailLayoutInput = {
    appName,
    appUrl: input.appUrl,
    logoSrc: input.logoSrc,
    preheader,
    bodyHtml,
  };

  return { subject, text, html: wrapEmailLayout(layoutInput) };
}
