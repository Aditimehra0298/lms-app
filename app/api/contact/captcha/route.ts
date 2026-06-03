import { NextResponse } from "next/server";
import { createContactCaptcha } from "@/lib/server/contact-captcha";

export const dynamic = "force-dynamic";

/** GET — simple math captcha for the contact form. */
export async function GET() {
  const captcha = createContactCaptcha();
  return NextResponse.json({ ok: true, ...captcha });
}
