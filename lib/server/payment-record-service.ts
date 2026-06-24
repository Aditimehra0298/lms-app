import { normalizeLearnerEmail } from "@/lib/learner-email";
import type { AdminPaymentRow, PaymentLineItem } from "@/lib/payment-types";
import { prisma } from "@/lib/prisma";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";
import { verifyRazorpayPaymentSignature } from "@/lib/server/razorpay-service";

function parseItems(raw: unknown): PaymentLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        slug: String(item.slug ?? "").trim(),
        title: String(item.title ?? "").trim(),
        qty: Math.max(1, Number(item.qty) || 1),
        price: String(item.price ?? "").trim(),
      };
    })
    .filter((item) => item.slug);
}

function formatAmountLabel(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const major = amount / 100;
  if (code === "INR") return `₹${major.toFixed(2)}`;
  return `${code} ${major.toFixed(2)}`;
}

function courseSummary(items: PaymentLineItem[]): string {
  if (items.length === 0) return "—";
  if (items.length === 1) return items[0].title || items[0].slug;
  return `${items[0].title || items[0].slug} +${items.length - 1} more`;
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id ?? null;
}

function toAdminRow(row: {
  id: string;
  learnerEmail: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  receipt: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string;
  items: unknown;
  countryCode: string | null;
  adminNote: string | null;
  grantedByEmail: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: { name: string | null } | null;
}): AdminPaymentRow {
  const items = parseItems(row.items);
  return {
    id: row.id,
    learnerEmail: row.learnerEmail,
    learnerName: row.user?.name ?? null,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    receipt: row.receipt,
    amount: row.amount,
    currency: row.currency,
    amountLabel: row.method === "admin_grant" ? "Waived" : formatAmountLabel(row.amount, row.currency),
    status: row.status,
    method: row.method,
    items,
    courseSummary: courseSummary(items),
    countryCode: row.countryCode,
    adminNote: row.adminNote,
    grantedByEmail: row.grantedByEmail,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPendingRazorpayPayment(input: {
  learnerEmail: string;
  orderId: string;
  receipt: string;
  amount: number;
  currency: string;
  items: PaymentLineItem[];
  countryCode?: string;
}) {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const userId = await resolveUserId(email);
  await prisma.lmsPayment.create({
    data: {
      learnerEmail: email,
      userId,
      razorpayOrderId: input.orderId,
      receipt: input.receipt,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: "pending",
      method: "razorpay",
      items: input.items,
      countryCode: input.countryCode ?? null,
    },
  });
}

export async function finalizeRazorpayPayment(input: {
  learnerEmail: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const orderId = input.orderId.trim();
  const paymentId = input.paymentId.trim();
  const signature = input.signature.trim();

  if (!email || !orderId || !paymentId || !signature) {
    return { ok: false, message: "Missing payment verification fields." };
  }

  const valid = verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
  if (!valid) {
    return { ok: false, message: "Payment signature verification failed." };
  }

  const row = await prisma.lmsPayment.findUnique({ where: { razorpayOrderId: orderId } });
  if (!row) {
    return { ok: false, message: "Payment order not found. Start checkout again." };
  }

  if (row.status === "paid" && row.razorpayPaymentId === paymentId) {
    return { ok: true };
  }

  const items = parseItems(row.items);
  const userId = row.userId ?? (await resolveUserId(email));

  await prisma.lmsPayment.update({
    where: { id: row.id },
    data: {
      learnerEmail: email,
      userId,
      razorpayPaymentId: paymentId,
      status: "paid",
      paidAt: new Date(),
    },
  });

  if (items.length > 0) {
    const result = await recordPurchasesForLearner({
      learnerEmail: email,
      courses: items.map((item) => ({ slug: item.slug, title: item.title || item.slug })),
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
  }

  return { ok: true };
}

export async function recordDemoPayment(input: {
  learnerEmail: string;
  items: PaymentLineItem[];
  amount: number;
  currency: string;
  countryCode?: string;
}): Promise<{ ok: true; paymentId: string } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  if (!email) return { ok: false, message: "Valid learner email is required." };

  const items = input.items.filter((i) => i.slug.trim());
  if (items.length === 0) return { ok: false, message: "At least one course is required." };

  const userId = await resolveUserId(email);
  const row = await prisma.lmsPayment.create({
    data: {
      learnerEmail: email,
      userId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: "demo",
      method: "demo",
      items,
      countryCode: input.countryCode ?? null,
      paidAt: new Date(),
      adminNote: "Demo checkout (no Razorpay charge)",
    },
  });

  const enrolled = await recordPurchasesForLearner({
    learnerEmail: email,
    courses: items.map((item) => ({ slug: item.slug, title: item.title || item.slug })),
    skipPurchaseEmail: true,
  });
  if (!enrolled.ok) return { ok: false, message: enrolled.message };

  return { ok: true, paymentId: row.id };
}

export async function grantCourseAccessWithoutPayment(input: {
  learnerEmail: string;
  courseSlug: string;
  courseTitle: string;
  grantedByEmail: string;
  adminNote?: string;
}): Promise<{ ok: true; paymentId: string; message: string } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.learnerEmail);
  const slug = input.courseSlug.trim().toLowerCase();
  const title = input.courseTitle.trim() || slug;
  const grantedBy = normalizeLearnerEmail(input.grantedByEmail);

  if (!email) return { ok: false, message: "Learner email is required." };
  if (!slug) return { ok: false, message: "Course slug is required." };
  if (!grantedBy) return { ok: false, message: "Admin email is required." };

  const userId = await resolveUserId(email);
  const row = await prisma.lmsPayment.create({
    data: {
      learnerEmail: email,
      userId,
      amount: 0,
      currency: "INR",
      status: "waived",
      method: "admin_grant",
      items: [{ slug, title, qty: 1, price: "0" }],
      adminNote: input.adminNote?.trim() || "Admin granted access without payment",
      grantedByEmail: grantedBy,
      paidAt: new Date(),
    },
  });

  const enrolled = await recordPurchasesForLearner({
    learnerEmail: email,
    courses: [{ slug, title }],
    skipPurchaseEmail: true,
  });
  if (!enrolled.ok) return { ok: false, message: enrolled.message };

  return {
    ok: true,
    paymentId: row.id,
    message: enrolled.recorded > 0 ? "Course access granted." : "Learner already had access — grant recorded.",
  };
}

export async function listAdminPayments(input?: {
  query?: string;
  status?: string;
  method?: string;
  limit?: number;
}): Promise<AdminPaymentRow[]> {
  const q = input?.query?.trim().toLowerCase() ?? "";
  const limit = Math.min(500, Math.max(1, input?.limit ?? 200));

  const rows = await prisma.lmsPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return rows
    .map(toAdminRow)
    .filter((row) => {
      if (input?.status && input.status !== "all" && row.status !== input.status) return false;
      if (input?.method && input.method !== "all" && row.method !== input.method) return false;
      if (!q) return true;
      const hay = [
        row.learnerEmail,
        row.learnerName ?? "",
        row.razorpayOrderId ?? "",
        row.razorpayPaymentId ?? "",
        row.receipt ?? "",
        row.courseSummary,
        row.adminNote ?? "",
        row.grantedByEmail ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
}
