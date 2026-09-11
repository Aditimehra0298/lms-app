import { NextResponse } from "next/server";
import { emailAppName } from "@/lib/email-brand-config";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { notifyAdminActivity } from "@/lib/server/admin-activity-email";

export const dynamic = "force-dynamic";

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

  try {
    await createFormSubmission({
      formType: "book-a-call",
      name: fullName,
      email,
      phone: mobile,
      message,
      pagePath: "/book-a-call",
    });

    await notifyAdminActivity({
      kind: "book-a-call",
      subject: `[Book a Call] ${fullName}`,
      title: `New Book a Call request via ${emailAppName()}`,
      detail: message,
      lines: {
        Name: fullName,
        Email: email,
        Mobile: mobile,
      },
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
