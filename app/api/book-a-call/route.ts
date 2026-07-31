import { NextResponse } from "next/server";
import { emailAppName } from "@/lib/email-brand-config";
import { SFT_EMAILS } from "@/lib/contact-site-data";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { sendTransactionalEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = process.env.CONTACT_INBOX?.trim() || SFT_EMAILS.info;
const BDM_EMAIL = process.env.CONTACT_BDM_INBOX?.trim() || SFT_EMAILS.bdm;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let body: {
    fullName?: string;
    email?: string;
    mobile?: string;
    message?: string;
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

  if (fullName.length < 2) {
    return NextResponse.json({ ok: false, message: "Please enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }
  if (mobile.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ ok: false, message: "Please enter a valid mobile number." }, { status: 400 });
  }
  if (message.length < 8) {
    return NextResponse.json({ ok: false, message: "Please add a short note about the call." }, { status: 400 });
  }

  const appName = emailAppName();
  const mailSubject = `[Book a Call] ${fullName}`;
  const text = [
    `New Book a Call request via ${appName}`,
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Mobile: ${mobile}`,
    "",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Book a Call request</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Mobile:</strong> ${escapeHtml(mobile)}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    await createFormSubmission({
      formType: "book-a-call",
      name: fullName,
      email,
      phone: mobile,
      message,
      pagePath: "/book-a-call",
    });

    await sendTransactionalEmail({
      to: [SUPPORT_EMAIL, BDM_EMAIL].filter(Boolean),
      subject: mailSubject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[book-a-call]", err);
    return NextResponse.json(
      { ok: false, message: "Could not send your request. Please try WhatsApp or email." },
      { status: 503 },
    );
  }
}
