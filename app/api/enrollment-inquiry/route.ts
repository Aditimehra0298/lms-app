import { NextResponse } from "next/server";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { queueAdminActivityEmail } from "@/lib/server/admin-activity-email";
import { sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/server/sanitize-user-text";

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

  const name = sanitizePlainText(body.name, 200);
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = sanitizePlainText(body.phone, 40);
  const organization = sanitizeOptionalPlainText(body.organization, 300);
  const courseSlug = sanitizeOptionalPlainText(body.courseSlug, 200);
  const courseTitle = sanitizeOptionalPlainText(body.courseTitle, 300);

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
      subject: courseTitle || courseSlug || undefined,
      category: "enrollment-inquiry",
      message: organization ? `Organization: ${organization}` : undefined,
      metadata: {
        courseSlug: courseSlug || null,
        organization: organization || null,
      },
    });
  } catch (err) {
    console.error("[enrollment-inquiry]", err);
  }

  queueAdminActivityEmail({
    kind: "enrollment-inquiry",
    subject: `[Enrollment] ${courseTitle || courseSlug || "Inquiry"} — ${name}`,
    title: "New enrollment inquiry",
    detail: organization
      ? `${name} asked about enrollment. Organization: ${organization}`
      : `${name} asked about enrollment.`,
    lines: {
      Name: name,
      Email: email,
      Phone: phone,
      Course: courseTitle || courseSlug || undefined,
      Organization: organization || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
