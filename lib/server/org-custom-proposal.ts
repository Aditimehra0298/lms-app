import { randomBytes, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { sendTransactionalEmail } from "@/lib/mail";

export const CUSTOM_PLAN_KEY_PREFIX = "custom:";

export const CUSTOM_PLAN_STAGES = ["new", "contacted", "proposal_sent", "won", "lost"] as const;
export type CustomPlanStage = (typeof CUSTOM_PLAN_STAGES)[number];

export type CustomPlanProposal = {
  token: string;
  orgEmail: string;
  title: string;
  seats: number;
  durationMonths: number;
  amountInr: number;
  message: string;
  sentAt: string;
  expiresAt: string;
  paidAt?: string;
};

export type CustomPlanRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  stage: CustomPlanStage;
  proposal: CustomPlanProposal | null;
};

export function customPlanKey(id: string): string {
  return `${CUSTOM_PLAN_KEY_PREFIX}${id}`;
}

export function customPlanIdFromKey(key: string): string | null {
  return key.startsWith(CUSTOM_PLAN_KEY_PREFIX) ? key.slice(CUSTOM_PLAN_KEY_PREFIX.length).trim() || null : null;
}

export function customPlanProposalUrl(id: string, token: string): string {
  return `${emailAppUrl().replace(/\/$/, "")}/custom-plan/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
}

function metaOf(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
}

function parseProposal(raw: unknown): CustomPlanProposal | null {
  const p = metaOf(raw);
  if (typeof p.token !== "string" || typeof p.orgEmail !== "string") return null;
  const seats = Number(p.seats);
  const durationMonths = Number(p.durationMonths);
  const amountInr = Number(p.amountInr);
  if (!(seats > 0 && durationMonths > 0 && amountInr > 0)) return null;
  return {
    token: p.token,
    orgEmail: p.orgEmail,
    title: typeof p.title === "string" ? p.title : "Custom Plan",
    seats,
    durationMonths,
    amountInr,
    message: typeof p.message === "string" ? p.message : "",
    sentAt: String(p.sentAt ?? ""),
    expiresAt: String(p.expiresAt ?? ""),
    paidAt: typeof p.paidAt === "string" ? p.paidAt : undefined,
  };
}

export function stageFromMetadata(raw: unknown): CustomPlanStage {
  const stage = metaOf(raw).stage;
  return CUSTOM_PLAN_STAGES.includes(stage as CustomPlanStage) ? (stage as CustomPlanStage) : "new";
}

export async function getCustomPlanRequest(id: string): Promise<CustomPlanRequest | null> {
  const row = await prisma.lmsFormSubmission.findUnique({ where: { id } });
  if (!row || row.formType !== "org-custom-plan") return null;
  const meta = metaOf(row.metadata);
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email,
    phone: row.phone ?? "",
    companyName: row.subject ?? "",
    stage: stageFromMetadata(meta),
    proposal: parseProposal(meta.proposal),
  };
}

async function patchMetadata(
  id: string,
  patch: Record<string, unknown>,
  status?: "new" | "read" | "done",
): Promise<void> {
  const row = await prisma.lmsFormSubmission.findUnique({ where: { id } });
  if (!row) throw new Error("Request not found");
  const meta = { ...metaOf(row.metadata), ...patch };
  await prisma.lmsFormSubmission.update({
    where: { id },
    data: { metadata: meta as Prisma.InputJsonValue, ...(status ? { status } : {}) },
  });
}

export async function setCustomPlanStage(id: string, stage: CustomPlanStage): Promise<void> {
  const status = stage === "won" || stage === "lost" ? "done" : stage === "new" ? "new" : "read";
  await patchMetadata(id, { stage, stageUpdatedAt: new Date().toISOString() }, status);
}

/** Valid, unexpired, unpaid proposal for a public link — null when the token doesn't match. */
export async function getProposalForToken(
  id: string,
  token: string,
): Promise<{ request: CustomPlanRequest; proposal: CustomPlanProposal } | null> {
  const request = await getCustomPlanRequest(id);
  const proposal = request?.proposal;
  if (!request || !proposal || !token) return null;
  const a = Buffer.from(proposal.token);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { request, proposal };
}

export function isProposalExpired(p: CustomPlanProposal): boolean {
  const t = Date.parse(p.expiresAt);
  return Number.isFinite(t) && t < Date.now();
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendCustomPlanProposal(
  id: string,
  input: { orgEmail: string; title: string; seats: number; durationMonths: number; amountInr: number; message: string; validDays: number },
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const request = await getCustomPlanRequest(id);
  if (!request) return { ok: false, message: "Request not found." };
  if (request.proposal?.paidAt) return { ok: false, message: "This request is already paid." };

  const orgEmail = normalizeLearnerEmail(input.orgEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgEmail)) return { ok: false, message: "Enter a valid organisation email." };
  const seats = Math.round(input.seats);
  const durationMonths = Math.round(input.durationMonths);
  const amountInr = Math.round(input.amountInr);
  if (!(seats >= 1 && seats <= 100000)) return { ok: false, message: "Seats must be at least 1." };
  if (!(durationMonths >= 1 && durationMonths <= 60)) return { ok: false, message: "Duration must be 1–60 months." };
  if (!(amountInr >= 1)) return { ok: false, message: "Enter the amount in ₹." };
  const validDays = Math.min(90, Math.max(1, Math.round(input.validDays || 14)));

  const now = new Date();
  const expires = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
  const proposal: CustomPlanProposal = {
    // Re-sending keeps the same link working.
    token: request.proposal?.token ?? randomBytes(24).toString("hex"),
    orgEmail,
    title: input.title.trim().slice(0, 160) || "Custom Plan",
    seats,
    durationMonths,
    amountInr,
    message: input.message.trim().slice(0, 4000),
    sentAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await patchMetadata(id, { proposal, stage: "proposal_sent", stageUpdatedAt: now.toISOString() }, "read");

  const url = customPlanProposalUrl(id, proposal.token);
  const company = request.companyName || "your organisation";
  const validTill = expires.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const summary = [
    `Plan: ${proposal.title}`,
    `Employees (seats): ${seats}`,
    `Duration: ${durationMonths} month${durationMonths === 1 ? "" : "s"}`,
    `Total: ${inr(amountInr)}`,
    `Valid till: ${validTill}`,
  ];
  const text = [
    `Hello ${request.name || ""},`.trim(),
    "",
    `Thank you for your interest in ${emailAppName()}. Here is the Custom Plan proposal for ${company}:`,
    "",
    ...summary,
    ...(proposal.message ? ["", proposal.message] : []),
    "",
    `Review and pay online: ${url}`,
    `Sign in with your organisation account (${orgEmail}) to complete the payment.`,
  ].join("\n");
  const html = `
    <p>Hello ${escapeHtml(request.name || "")},</p>
    <p>Thank you for your interest in ${escapeHtml(emailAppName())}. Here is the Custom Plan proposal for <strong>${escapeHtml(company)}</strong>:</p>
    <table cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">
      ${summary.map((l) => { const [k, ...v] = l.split(": "); return `<tr><td style="border:1px solid #ddd"><strong>${escapeHtml(k)}</strong></td><td style="border:1px solid #ddd">${escapeHtml(v.join(": "))}</td></tr>`; }).join("")}
    </table>
    ${proposal.message ? `<p style="white-space:pre-line">${escapeHtml(proposal.message)}</p>` : ""}
    <p><a href="${url}" style="display:inline-block;background:#f59e0b;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review &amp; Pay</a></p>
    <p style="color:#666;font-size:12px">Sign in with your organisation account (${escapeHtml(orgEmail)}) to complete the payment.</p>
  `;
  const recipients = [...new Set([orgEmail, normalizeLearnerEmail(request.email)].filter(Boolean))];
  for (const to of recipients) {
    await sendTransactionalEmail({ to, subject: `Your Custom Plan proposal — ${company}`, text, html }).catch((err) =>
      console.error("[custom-plan] proposal email", to, err),
    );
  }
  return { ok: true, url };
}

/** Called after the proposal payment is verified and the subscription is active. */
export async function markCustomPlanPaid(id: string): Promise<void> {
  const request = await getCustomPlanRequest(id);
  if (!request?.proposal || request.proposal.paidAt) return;
  const paidAt = new Date().toISOString();
  await patchMetadata(id, { proposal: { ...request.proposal, paidAt }, stage: "won", stageUpdatedAt: paidAt }, "done");

  const p = request.proposal;
  const base = emailAppUrl().replace(/\/$/, "");
  await sendTransactionalEmail({
    to: p.orgEmail,
    subject: `Your ${emailAppName()} Custom Plan is active`,
    text: [
      "Hello,",
      "",
      `Payment received — your Custom Plan is now active for ${p.seats} employees for ${p.durationMonths} months.`,
      "",
      `Add employees and assign courses: ${base}/my-learning?tab=dashboard`,
    ].join("\n"),
    html: `
      <p>Hello,</p>
      <p>Payment received — your Custom Plan is now active for <strong>${p.seats} employees</strong> for <strong>${p.durationMonths} months</strong>.</p>
      <p><a href="${base}/my-learning?tab=dashboard" style="display:inline-block;background:#f59e0b;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open organisation dashboard</a></p>
    `,
  }).catch((err) => console.error("[custom-plan] activation email", err));
}

export async function sendCustomPlanAcknowledgement(input: { to: string; name: string; companyName: string }): Promise<void> {
  await sendTransactionalEmail({
    to: input.to,
    subject: `We received your Custom Plan request — ${emailAppName()}`,
    text: [
      `Hello ${input.name},`,
      "",
      `Thank you for sharing the training requirements for ${input.companyName}. Our team will review them and contact you within 24 hours with a tailored proposal.`,
      "",
      `— ${emailAppName()}`,
    ].join("\n"),
    html: `
      <p>Hello ${escapeHtml(input.name)},</p>
      <p>Thank you for sharing the training requirements for <strong>${escapeHtml(input.companyName)}</strong>. Our team will review them and contact you within 24 hours with a tailored proposal.</p>
      <p>— ${escapeHtml(emailAppName())}</p>
    `,
  });
}
