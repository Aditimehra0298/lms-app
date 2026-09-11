import { NextResponse } from "next/server";
import { verifyContactCaptcha } from "@/lib/server/contact-captcha";
import { emailAppName } from "@/lib/email-brand-config";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { notifyAdminActivity } from "@/lib/server/admin-activity-email";
import { sanitizePlainText } from "@/lib/server/sanitize-user-text";

export const dynamic = "force-dynamic";

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

  const fullName = sanitizePlainText(body.fullName, 200);
  const email = body.email?.trim().toLowerCase() ?? "";
  const mobile = sanitizePlainText(body.mobile, 40);
  const message = sanitizePlainText(body.message, 5000);
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
    await notifyAdminActivity({
      kind: "contact",
      subject: `[Contact] Business / career inquiry — ${fullName}`,
      title: `New contact message via ${emailAppName()}`,
      detail: message,
      lines: {
        Name: fullName,
        Email: email,
        Mobile: mobile,
        Page: body.pagePath?.trim() || "/contact",
      },
    });
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
