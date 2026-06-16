import {
  EMAIL_BRAND,
  emailButton,
  emailInfoCard,
  escapeHtml,
  wrapEmailLayout,
} from "@/lib/email-templates/layout";
import type { RegistrationLookupResult } from "@/lib/server/registration-lookup";

export type WelcomeEmailMethod = "email" | "google";

export type WelcomeEmailTemplateInput = {
  learnerName?: string | null;
  email: string;
  method: WelcomeEmailMethod;
  appUrl: string;
  appName: string;
  shortBrand: string;
  logoUrl?: string;
  /** Loaded from MySQL after registration. */
  registration?: RegistrationLookupResult | null;
};

function displayName(input: WelcomeEmailTemplateInput): string {
  const name =
    input.learnerName?.trim() ||
    input.registration?.name?.trim();
  if (name) return name;
  const local = input.email.split("@")[0]?.trim();
  return local || "Learner";
}

export function buildWelcomeEmail(input: WelcomeEmailTemplateInput): {
  subject: string;
  text: string;
  html: string;
  dashboardUrl: string;
  exploreCoursesUrl: string;
} {
  const name = displayName(input);
  const appName = input.appName.trim() || "SF Trainings";
  const sft = input.shortBrand.trim() || "SFT";
  const base = input.appUrl.replace(/\/$/, "");
  const dashboardUrl = `${base}/my-learning?tab=dashboard`;
  const exploreCoursesUrl = `${base}/courses`;
  const myLearningUrl = `${base}/my-learning`;

  const methodLine =
    input.method === "google"
      ? "You signed up with Google and can sign in anytime with the same account."
      : "You signed up with your verified email and password.";

  const subject = `Welcome to ${sft} — your dashboard is ready`;

  const reg = input.registration;
  const regCode = reg?.registrationCode?.trim();

  const text = [
    `Hi ${name},`,
    "",
    `Welcome to ${sft} (${appName})!`,
    methodLine,
    "",
    ...(regCode ? [`Your learner ID: ${regCode}`, ""] : []),
    `Your dashboard: ${dashboardUrl}`,
    `Explore our courses: ${exploreCoursesUrl}`,
    `My Learning: ${myLearningUrl}`,
    "",
    `Account email: ${input.email}`,
    "",
    "If you did not create this account, contact us immediately.",
    "",
    `— ${appName}`,
  ].join("\n");

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Email", value: input.email },
  ];
  if (regCode) infoRows.push({ label: "Learner ID", value: regCode });
  if (reg?.countryName) infoRows.push({ label: "Country", value: reg.countryName });
  infoRows.push({ label: "Status", value: "Active" });

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.gold}">Welcome to ${escapeHtml(sft)}</p>
    <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;line-height:1.25;color:#18181b">Hi ${escapeHtml(name)}, your account is ready</h2>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${EMAIL_BRAND.textBody}">
      Thank you for joining <strong>${escapeHtml(appName)}</strong>.
      ${escapeHtml(methodLine)}
      Your profile is saved — use the links below to open your dashboard or browse courses.
    </p>

    ${emailInfoCard(infoRows)}

    <table role="presentation" class="btn-stack" cellpadding="0" cellspacing="0" style="margin:0 0 28px;width:100%">
      <tr>
        <td style="padding:0 12px 14px 0;width:50%">${emailButton(dashboardUrl, "Your dashboard", "primary")}</td>
        <td style="padding:0 0 14px 0;width:50%">${emailButton(exploreCoursesUrl, "Explore our courses", "secondary")}</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:${EMAIL_BRAND.surface};border-radius:14px;border:1px solid ${EMAIL_BRAND.borderSoft}">
      <tr>
        <td style="padding:16px 18px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9a6812">Quick links</p>
          <p style="margin:0;font-size:14px;line-height:1.6">
            <a href="${escapeHtml(dashboardUrl)}" style="color:${EMAIL_BRAND.goldDark};font-weight:600;text-decoration:none">Dashboard</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(exploreCoursesUrl)}" style="color:${EMAIL_BRAND.goldDark};font-weight:600;text-decoration:none">All courses</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(myLearningUrl)}" style="color:${EMAIL_BRAND.goldDark};font-weight:600;text-decoration:none">My Learning</a>
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:13px;line-height:1.55;color:#71717a">
      Didn't register? Ignore this email or contact ${escapeHtml(appName)} support.
    </p>
  `;

  const html = wrapEmailLayout({
    appName,
    appUrl: base,
    logoSrc: input.logoUrl,
    preheader: `Welcome to ${sft}! Open your dashboard and explore courses.`,
    bodyHtml,
  });

  return { subject, text, html, dashboardUrl, exploreCoursesUrl };
}
