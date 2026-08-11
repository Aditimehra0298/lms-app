import { normalizeLearnerEmail } from "@/lib/learner-email";
import type { AdminPaymentRow, PaymentLineItem } from "@/lib/payment-types";
import { prisma } from "@/lib/prisma";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";
import { resolveGrantableOfferingTitle } from "@/lib/server/admin-grantable-offerings";
import {
  createRazorpayRefund,
  fetchRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  verifyRazorpayPaymentSignature,
  type RazorpayGatewayPayment,
} from "@/lib/server/razorpay-service";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";
import { consumePromotionCode, promoCodeFromNote, promoNote } from "@/lib/server/checkout-promo";

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
  adminNote?: string;
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
      adminNote: input.adminNote ?? null,
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

  const promoCode = promoCodeFromNote(row.adminNote);
  if (promoCode) {
    await consumePromotionCode(promoCode).catch((err) =>
      console.error("[payments] consumePromotionCode", err),
    );
  }

  return { ok: true };
}

export async function recordDemoPayment(input: {
  learnerEmail: string;
  items: PaymentLineItem[];
  amount: number;
  currency: string;
  countryCode?: string;
  promoCode?: string;
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
      adminNote: promoNote(input.promoCode ?? "") ?? "Demo checkout (no Razorpay charge)",
    },
  });

  if (input.promoCode?.trim()) {
    await consumePromotionCode(input.promoCode).catch((err) =>
      console.error("[payments] consumePromotionCode demo", err),
    );
  }

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

  const resolvedTitle = await resolveGrantableOfferingTitle(slug, title);
  const userId = await resolveUserId(email);
  const row = await prisma.lmsPayment.create({
    data: {
      learnerEmail: email,
      userId,
      amount: 0,
      currency: "INR",
      status: "waived",
      method: "admin_grant",
      items: [{ slug, title: resolvedTitle, qty: 1, price: "0" }],
      adminNote: input.adminNote?.trim() || "Admin granted access without payment",
      grantedByEmail: grantedBy,
      paidAt: new Date(),
    },
  });

  const enrolled = await recordPurchasesForLearner({
    learnerEmail: email,
    courses: [{ slug, title: resolvedTitle }],
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

const REFUNDABLE_STATUSES = new Set(["paid", "demo", "waived"]);

function appendAdminNote(existing: string | null, line: string): string {
  return [existing?.trim(), line].filter(Boolean).join("\n").slice(0, 512);
}

async function enrollFromPaymentRow(row: {
  learnerEmail: string;
  items: unknown;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const items = parseItems(row.items);
  if (items.length === 0) return { ok: true };
  const result = await recordPurchasesForLearner({
    learnerEmail: row.learnerEmail,
    courses: items.map((item) => ({ slug: item.slug, title: item.title || item.slug })),
  });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

async function revokeAccessForPaymentRow(row: {
  learnerEmail: string;
  items: unknown;
}): Promise<number> {
  const items = parseItems(row.items);
  const slugs = [...new Set(items.map((item) => item.slug).filter(Boolean))];
  if (slugs.length === 0) return 0;
  const result = await prisma.lmsPurchase.deleteMany({
    where: {
      learnerEmail: row.learnerEmail,
      courseSlug: { in: slugs },
    },
  });
  return result.count;
}

export async function refundAdminPayment(input: {
  paymentId: string;
  refundedByEmail: string;
  refundNote?: string;
  revokeAccess?: boolean;
  /** When true, call Razorpay refunds API for Razorpay paid rows. */
  viaGateway?: boolean;
  /** Optional partial refund amount in paise. Full refund if omitted. */
  refundAmountPaise?: number;
}): Promise<
  | { ok: true; message: string; revokedCourses: number; razorpayRefundId?: string }
  | { ok: false; message: string }
> {
  const paymentId = input.paymentId.trim();
  const refundedBy = normalizeLearnerEmail(input.refundedByEmail);
  if (!paymentId) return { ok: false, message: "Payment id is required." };
  if (!refundedBy) return { ok: false, message: "Admin email is required." };

  const row = await prisma.lmsPayment.findUnique({ where: { id: paymentId } });
  if (!row) return { ok: false, message: "Payment record not found." };
  if (row.status === "refunded") return { ok: false, message: "This payment is already refunded." };
  if (!REFUNDABLE_STATUSES.has(row.status)) {
    return { ok: false, message: `Cannot refund a payment with status “${row.status}”.` };
  }

  let razorpayRefundId: string | undefined;
  const note = input.refundNote?.trim() || "Refunded by admin";
  const stamp = new Date().toISOString();

  if (input.viaGateway && row.method === "razorpay" && row.status === "paid") {
    if (!row.razorpayPaymentId) {
      return { ok: false, message: "Update this order first, then try the refund again." };
    }
    if (!isRazorpayConfigured()) {
      return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
    }
    const refundAmount =
      typeof input.refundAmountPaise === "number" && input.refundAmountPaise > 0
        ? Math.min(input.refundAmountPaise, row.amount)
        : row.amount;
    const gateway = await createRazorpayRefund({
      paymentId: row.razorpayPaymentId,
      amount: refundAmount,
      notes: {
        lmsPaymentId: row.id,
        refundedBy,
        note: note.slice(0, 200),
      },
    });
    if (!gateway.ok) return { ok: false, message: gateway.message };
    razorpayRefundId = gateway.refundId;
  }

  const appended = appendAdminNote(
    row.adminNote,
    [
      `Refund (${stamp}): ${note} — by ${refundedBy}`,
      razorpayRefundId ? `Razorpay refund: ${razorpayRefundId}` : input.viaGateway ? null : "LMS-only (no gateway call)",
    ]
      .filter(Boolean)
      .join(" · "),
  );

  await prisma.lmsPayment.update({
    where: { id: paymentId },
    data: {
      status: "refunded",
      adminNote: appended,
      grantedByEmail: row.grantedByEmail ?? refundedBy,
    },
  });

  let revokedCourses = 0;
  if (input.revokeAccess !== false) {
    revokedCourses = await revokeAccessForPaymentRow(row);
  }

  const gatewayBit = razorpayRefundId ? " Money has been returned to the learner." : "";
  return {
    ok: true,
    revokedCourses,
    razorpayRefundId,
    message:
      revokedCourses > 0
        ? `Refund done and course access removed for ${revokedCourses} course(s).${gatewayBit}`
        : `Refund done. Course access was left unchanged.${gatewayBit}`,
  };
}

export async function markPaymentFailed(input: {
  paymentId: string;
  adminEmail: string;
  note?: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const id = input.paymentId.trim();
  const admin = normalizeLearnerEmail(input.adminEmail);
  if (!id) return { ok: false, message: "Payment id is required." };

  const row = await prisma.lmsPayment.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Payment record not found." };
  if (row.status === "paid" || row.status === "refunded" || row.status === "waived" || row.status === "demo") {
    return { ok: false, message: `Cannot mark “${row.status}” as failed.` };
  }

  const stamp = new Date().toISOString();
  await prisma.lmsPayment.update({
    where: { id },
    data: {
      status: "failed",
      adminNote: appendAdminNote(
        row.adminNote,
        `Marked failed (${stamp}) by ${admin || "admin"}${input.note?.trim() ? `: ${input.note.trim()}` : ""}`,
      ),
    },
  });

  return { ok: true, message: "Order marked as unsuccessful." };
}

export async function getPaymentGatewaySnapshot(paymentId: string): Promise<
  | {
      ok: true;
      local: AdminPaymentRow;
      order: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        receipt: string | null;
        attempts: number;
        amountPaid: number;
      } | null;
      payment: RazorpayGatewayPayment | null;
      paymentsOnOrder: RazorpayGatewayPayment[];
    }
  | { ok: false; message: string }
> {
  const row = await prisma.lmsPayment.findUnique({
    where: { id: paymentId.trim() },
    include: { user: { select: { name: true } } },
  });
  if (!row) return { ok: false, message: "Payment record not found." };

  const local = toAdminRow(row);
  let order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt: string | null;
    attempts: number;
    amountPaid: number;
  } | null = null;
  let payment: RazorpayGatewayPayment | null = null;
  let paymentsOnOrder: RazorpayGatewayPayment[] = [];

  if (row.razorpayPaymentId) {
    const fetched = await fetchRazorpayPayment(row.razorpayPaymentId);
    if (fetched.ok) payment = fetched.payment;
  }
  if (row.razorpayOrderId) {
    const fetchedOrder = await fetchRazorpayOrder(row.razorpayOrderId);
    if (fetchedOrder.ok) order = fetchedOrder.order;
    const fetchedPayments = await fetchRazorpayOrderPayments(row.razorpayOrderId);
    if (fetchedPayments.ok) paymentsOnOrder = fetchedPayments.payments;
    if (!payment && paymentsOnOrder.length > 0) {
      payment =
        paymentsOnOrder.find((p) => p.status === "captured") ??
        paymentsOnOrder.find((p) => p.status === "authorized") ??
        paymentsOnOrder[0] ??
        null;
    }
  }

  return { ok: true, local, order, payment, paymentsOnOrder };
}

export async function syncPaymentFromGateway(input: {
  paymentId: string;
  adminEmail: string;
}): Promise<{ ok: true; message: string; status: string } | { ok: false; message: string }> {
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
  }

  const id = input.paymentId.trim();
  const admin = normalizeLearnerEmail(input.adminEmail);
  const row = await prisma.lmsPayment.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Payment record not found." };
  if (row.method !== "razorpay") {
    return { ok: false, message: "Only online payments can be updated this way." };
  }
  if (!row.razorpayOrderId && !row.razorpayPaymentId) {
    return { ok: false, message: "This order has no online payment reference to update." };
  }

  let gatewayPayment: RazorpayGatewayPayment | null = null;
  if (row.razorpayPaymentId) {
    const fetched = await fetchRazorpayPayment(row.razorpayPaymentId);
    if (!fetched.ok) return { ok: false, message: fetched.message };
    gatewayPayment = fetched.payment;
  } else if (row.razorpayOrderId) {
    const orderPayments = await fetchRazorpayOrderPayments(row.razorpayOrderId);
    if (!orderPayments.ok) return { ok: false, message: orderPayments.message };
    gatewayPayment =
      orderPayments.payments.find((p) => p.status === "captured") ??
      orderPayments.payments.find((p) => p.status === "authorized") ??
      orderPayments.payments[0] ??
      null;

    if (!gatewayPayment) {
      const order = await fetchRazorpayOrder(row.razorpayOrderId);
      if (!order.ok) return { ok: false, message: order.message };
      if (order.order.status === "created" || order.order.status === "attempted") {
        const ageMs = Date.now() - row.createdAt.getTime();
        if (ageMs > 24 * 60 * 60 * 1000 && row.status === "pending") {
          await prisma.lmsPayment.update({
            where: { id: row.id },
            data: {
              status: "failed",
              adminNote: appendAdminNote(
                row.adminNote,
                `Sync (${new Date().toISOString()}): order still ${order.order.status} after 24h — marked failed by ${admin}`,
              ),
            },
          });
          return { ok: true, status: "failed", message: "This checkout was never paid — marked unsuccessful." };
        }
        return {
          ok: true,
          status: row.status,
          message: "Payment has not been received yet. Nothing changed.",
        };
      }
    }
  }

  if (!gatewayPayment) {
    return { ok: false, message: "No online payment was found for this order." };
  }

  const stamp = new Date().toISOString();

  if (gatewayPayment.status === "captured" || (gatewayPayment.captured && gatewayPayment.status !== "refunded")) {
    if (row.status === "paid" && row.razorpayPaymentId === gatewayPayment.id) {
      return { ok: true, status: "paid", message: "Already up to date (paid)." };
    }
    await prisma.lmsPayment.update({
      where: { id: row.id },
      data: {
        razorpayPaymentId: gatewayPayment.id,
        status: "paid",
        paidAt: row.paidAt ?? new Date(),
        adminNote: appendAdminNote(row.adminNote, `Synced paid from Razorpay (${stamp}) by ${admin}`),
      },
    });
    const enrolled = await enrollFromPaymentRow(row);
    if (!enrolled.ok) return { ok: false, message: enrolled.message };
    return { ok: true, status: "paid", message: "Payment confirmed. Learner now has course access." };
  }

  if (
    gatewayPayment.status === "refunded" ||
    (gatewayPayment.amountRefunded > 0 && gatewayPayment.refundStatus === "full")
  ) {
    await prisma.lmsPayment.update({
      where: { id: row.id },
      data: {
        razorpayPaymentId: gatewayPayment.id,
        status: "refunded",
        adminNote: appendAdminNote(row.adminNote, `Synced refunded from Razorpay (${stamp}) by ${admin}`),
      },
    });
    const revoked = await revokeAccessForPaymentRow(row);
    return {
      ok: true,
      status: "refunded",
      message: `Payment was refunded${revoked ? ` — removed access to ${revoked} course(s)` : ""}.`,
    };
  }

  if (gatewayPayment.status === "failed") {
    await prisma.lmsPayment.update({
      where: { id: row.id },
      data: {
        razorpayPaymentId: gatewayPayment.id,
        status: "failed",
        adminNote: appendAdminNote(
          row.adminNote,
          `Synced failed from Razorpay (${stamp}) by ${admin}${
            gatewayPayment.errorDescription ? `: ${gatewayPayment.errorDescription}` : ""
          }`,
        ),
      },
    });
    return { ok: true, status: "failed", message: "Payment was unsuccessful." };
  }

  return {
    ok: true,
    status: row.status,
    message: "Payment is still in progress. Nothing changed yet.",
  };
}

export async function syncPendingRazorpayPayments(input: {
  adminEmail: string;
  limit?: number;
}): Promise<{ ok: true; message: string; synced: number; results: Array<{ id: string; message: string }> }> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const pending = await prisma.lmsPayment.findMany({
    where: { method: "razorpay", status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results: Array<{ id: string; message: string }> = [];
  let synced = 0;
  for (const row of pending) {
    const result = await syncPaymentFromGateway({
      paymentId: row.id,
      adminEmail: input.adminEmail,
    });
    results.push({ id: row.id, message: result.message });
    if (result.ok && (result.status === "paid" || result.status === "failed" || result.status === "refunded")) {
      synced += 1;
    }
  }

  return {
    ok: true,
    synced,
    results,
    message: `Checked ${pending.length} waiting payment(s); updated ${synced}.`,
  };
}

