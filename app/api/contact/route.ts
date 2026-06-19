import { NextResponse } from "next/server";
import { verifyContactCaptcha } from "@/lib/server/contact-captcha";
import { emailAppName } from "@/lib/email-brand-config";
import { SFT_EMAILS } from "@/lib/contact-site-data";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { sendTransactionalEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = process.env.CONTACT_INBOX?.trim() || SFT_EMAILS.info;
const BDM_EMAIL = process.env.CONTACT_BDM_INBOX?.trim() || SFT_EMAILS.bdm;

export async function POST(request: Request) {
  let body: {
    fullName?: string;
    email?: string;
    mobile?: string;
    message?: string;
    captchaAnswer?: string | number;
    captchaToken?: string;
    pagePath?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const mobile = body.mobile?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const captchaToken = body.captchaToken?.trim() ?? "";
  const captchaAnswer = Number(String(body.captchaAnswer ?? "").trim());

  if (fullName.length < 2) {
    return NextResponse.json({ ok: false, message: "Please enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }
  if (mobile.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ ok: false, message: "Please enter a valid mobile number." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ ok: false, message: "Please write at least 10 characters in your message." }, { status: 400 });
  }
  if (!captchaToken || !Number.isFinite(captchaAnswer) || !verifyContactCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ ok: false, message: "Incorrect captcha. Please try again." }, { status: 400 });
  }

  const appName = emailAppName();
  const mailSubject = `[Contact] Business / career inquiry — ${fullName}`;
  const text = [
    `New contact message via ${appName}`,
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Mobile: ${mobile}`,
    "",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">New contact message</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Mobile:</strong> ${escapeHtml(mobile)}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    await createFormSubmission({
      formType: "contact",
      name: fullName,
      email,
      phone: mobile,
      message,
      pagePath: body.pagePath?.trim() || "/contact",
      metadata: { source: "contact_page" },
    });
  } catch (dbErr) {
    console.error("[api/contact] save submission", dbErr);
  }

  try {
    await sendTransactionalEmail({
      to: SUPPORT_EMAIL,
      subject: mailSubject,
      text,
      html,
    });
    if (BDM_EMAIL && BDM_EMAIL !== SUPPORT_EMAIL) {
      await sendTransactionalEmail({
        to: BDM_EMAIL,
        subject: mailSubject,
        text,
        html,
      }).catch(() => null);
    }
    return NextResponse.json({
      ok: true,
      message: "Thank you! Your message has been sent. We will get in touch with you shortly.",
    });
  } catch (err) {
    console.error("[api/contact] email", err);
    return NextResponse.json(
      { ok: false, message: "Could not send your message right now. Please try email or phone instead." },
      { status: 503 },
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
