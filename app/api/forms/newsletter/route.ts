import { NextResponse } from "next/server";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { sendNewsletterViaN8n } from "@/lib/server/n8n-newsletter-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; pagePath?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  const pagePath = body.pagePath?.trim() || "/";

  try {
    await createFormSubmission({
      formType: "newsletter",
      email,
      pagePath,
    });

    const n8n = await sendNewsletterViaN8n({ email, pagePath });
    if (!n8n.ok) {
      console.warn(`[api/forms/newsletter] saved ${email}; n8n: ${n8n.message ?? "failed"}`);
    }

    return NextResponse.json({
      ok: true,
      message: "Thank you for subscribing to our newsletter.",
    });
  } catch (err) {
    console.error("[api/forms/newsletter]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save your subscription. Please try again later." },
      { status: 503 },
    );
  }
}
