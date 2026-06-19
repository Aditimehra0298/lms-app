import { NextResponse } from "next/server";
import { createFormSubmission } from "@/lib/server/form-submissions-store";

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

  try {
    await createFormSubmission({
      formType: "newsletter",
      email,
      pagePath: body.pagePath?.trim() || "/",
    });
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
