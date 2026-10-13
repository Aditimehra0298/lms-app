import { NextResponse } from "next/server";
import { getClientIps } from "@/lib/request-ip";
import { notifyAdminActivity } from "@/lib/server/admin-activity-email";
import { createFormSubmission } from "@/lib/server/form-submissions-store";
import { hitRateLimit } from "@/lib/server/otp-rate-limit";
import { sendCustomPlanAcknowledgement } from "@/lib/server/org-custom-proposal";
import { sanitizePlainText } from "@/lib/server/sanitize-user-text";

export const dynamic = "force-dynamic";

type Body = {
  fullName?: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  designation?: string;
  industry?: string;
  companySize?: string;
  employeesToTrain?: string;
  trainingFormats?: string[];
  topics?: string;
  duration?: string;
  startTimeline?: string;
  budget?: string;
  requirements?: string;
  website?: string;
};

const ALLOWED_FORMATS = ["Self-paced eLearning", "Live tutor-led (online)", "Onsite classroom", "Custom content", "Workshops"];

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "website" field.
  if (body.website?.trim()) {
    return NextResponse.json({ ok: true, message: "Thank you! Our team will contact you shortly." });
  }

  const { ipv4, ipv6 } = getClientIps(request);
  const limit = hitRateLimit(
    `org-custom-plan:${ipv4 || ipv6 || "unknown"}`,
    5,
    60 * 60 * 1000,
    "Too many requests. Please try again later or email us directly.",
  );
  if (!limit.ok) {
    return NextResponse.json({ ok: false, message: limit.message }, { status: 429 });
  }

  const fullName = sanitizePlainText(body.fullName, 200);
  const email = body.email?.trim().toLowerCase() ?? "";
  const mobile = sanitizePlainText(body.mobile, 40);
  const companyName = sanitizePlainText(body.companyName, 200);
  const designation = sanitizePlainText(body.designation, 120);
  const industry = sanitizePlainText(body.industry, 120);
  const companySize = sanitizePlainText(body.companySize, 40);
  const employeesToTrain = sanitizePlainText(body.employeesToTrain, 20);
  const topics = sanitizePlainText(body.topics, 2000);
  const duration = sanitizePlainText(body.duration, 60);
  const startTimeline = sanitizePlainText(body.startTimeline, 60);
  const budget = sanitizePlainText(body.budget, 60);
  const requirements = sanitizePlainText(body.requirements, 5000);
  const trainingFormats = (Array.isArray(body.trainingFormats) ? body.trainingFormats : []).filter((f) =>
    ALLOWED_FORMATS.includes(f),
  );

  if (fullName.length < 2) return bad("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Please enter a valid work email.");
  if (mobile.replace(/\D/g, "").length < 8) return bad("Please enter a valid mobile number.");
  if (companyName.length < 2) return bad("Please enter your company name.");
  if (!employeesToTrain || !/^\d+$/.test(employeesToTrain) || Number(employeesToTrain) < 1) {
    return bad("Please enter how many employees need training.");
  }
  if (requirements.length < 10) return bad("Please describe your requirements (at least 10 characters).");

  const details: Record<string, string> = {
    Company: companyName,
    Designation: designation || "—",
    Industry: industry || "—",
    "Company size": companySize || "—",
    "Employees to train": employeesToTrain,
    "Training formats": trainingFormats.join(", ") || "—",
    "Topics / courses": topics || "—",
    Duration: duration || "—",
    "Start timeline": startTimeline || "—",
    Budget: budget || "—",
  };
  const message = [
    ...Object.entries(details).map(([k, v]) => `${k}: ${v}`),
    "",
    "Requirements:",
    requirements,
  ].join("\n");

  try {
    await createFormSubmission({
      formType: "org-custom-plan",
      name: fullName,
      email,
      phone: mobile,
      subject: companyName,
      category: `${employeesToTrain} employees`,
      message,
      pagePath: "/#pricing",
      metadata: { source: "custom_plan_popup", stage: "new", ...details, trainingFormats },
    });
  } catch (err) {
    console.error("[api/organization/custom-plan-request] save", err);
    return NextResponse.json(
      { ok: false, message: "Could not submit right now. Please try again or contact us by email." },
      { status: 503 },
    );
  }

  void notifyAdminActivity({
    kind: "other",
    subject: `[Custom Plan] ${companyName} — ${employeesToTrain} employees`,
    title: "New organisation Custom Plan request",
    detail: requirements,
    lines: { Name: fullName, Email: email, Mobile: mobile, ...details },
  }).catch(() => {});
  void sendCustomPlanAcknowledgement({ to: email, name: fullName, companyName }).catch((err) =>
    console.error("[api/organization/custom-plan-request] acknowledgement", err),
  );

  return NextResponse.json({
    ok: true,
    message: "Thank you! Our team will review your requirements and contact you within 24 hours.",
  });
}

function bad(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}
