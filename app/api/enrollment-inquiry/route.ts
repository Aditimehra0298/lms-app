import { NextResponse } from "next/server";
import { createFormSubmission } from "@/lib/server/form-submissions-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    organization?: string;
    courseSlug?: string;
    courseTitle?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, message: "Please enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email." }, { status: 400 });
  }
  if (phone.length < 6) {
    return NextResponse.json({ ok: false, message: "Please enter a valid phone number." }, { status: 400 });
  }

  try {
    await createFormSubmission({
      formType: "enrollment",
      email,
      name,
      phone,
      subject: body.courseTitle?.trim() || body.courseSlug?.trim() || undefined,
      category: "enrollment-inquiry",
      message: body.organization?.trim()
        ? `Organization: ${body.organization.trim()}`
        : undefined,
      metadata: {
        courseSlug: body.courseSlug?.trim() || null,
        organization: body.organization?.trim() || null,
      },
    });
  } catch (err) {
    console.error("[enrollment-inquiry]", err);
  }

  return NextResponse.json({ ok: true });
}
