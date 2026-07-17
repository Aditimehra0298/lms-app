import crypto from "crypto";
import Razorpay from "razorpay";
import { nanoid } from "nanoid";
import { toSmallestCurrencyUnit } from "@/lib/checkout-totals";
import { computeRegionalCheckoutTotals } from "@/lib/checkout-regional-pricing";
import { getManagedCourses } from "@/lib/server/course-catalog";
import {
  isPaymentCurrencySupported,
  minimumPaymentAmountSmallestUnit,
  normalizePaymentCurrency,
  resolveLearnerPricingRegion,
} from "@/lib/server/checkout-payment-region";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  isRazorpayConfigured,
} from "@/lib/server/razorpay-config";

export type RazorpayCheckoutItem = {
  slug: string;
  title: string;
  price: string;
  qty: number;
};

function getClient(): Razorpay {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(input: {
  learnerEmail: string;
  items: RazorpayCheckoutItem[];
  countryCode?: string;
  currency?: string;
}) {
  if (!isRazorpayConfigured()) {
    return { ok: false as const, message: "Razorpay is not configured on the server." };
  }

  const items = input.items.filter((item) => item.slug.trim());
  if (items.length === 0) {
    return { ok: false as const, message: "No checkout items provided." };
  }

  const region = await resolveLearnerPricingRegion({
    learnerEmail: input.learnerEmail,
    countryCode: input.countryCode,
  });
  const currency = normalizePaymentCurrency(input.currency ?? region.currency, region.currency);

  if (!isPaymentCurrencySupported(currency)) {
    return {
      ok: false as const,
      message: `Currency ${currency} is not supported for Razorpay checkout. Update the learner region or contact support.`,
    };
  }

  const catalog = await getManagedCourses();
  const totals = computeRegionalCheckoutTotals(items, catalog, region);
  const amount = toSmallestCurrencyUnit(totals.total, currency);
  const minAmount = minimumPaymentAmountSmallestUnit(currency);
  if (amount < minAmount) {
    return {
      ok: false as const,
      message: `Order total is below the minimum for ${currency}.`,
    };
  }

  const receipt = `lms_${nanoid(12)}`;
  const client = getClient();
  const order = await client.orders.create({
    amount,
    currency,
    receipt,
    notes: {
      learnerEmail: input.learnerEmail.trim().toLowerCase(),
      countryCode: region.countryCode,
      courseSlugs: items.map((i) => i.slug).join(","),
    },
  });

  return {
    ok: true as const,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt,
    keyId: getRazorpayKeyId()!,
    totals,
    region: {
      countryCode: region.countryCode,
      countryName: region.countryName,
      currency: region.currency,
    },
  };
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getRazorpayKeySecret();
  if (!secret) return false;
  const body = `${input.orderId}|${input.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === input.signature.trim();
}

export type RazorpayGatewayPayment = {
  id: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  email: string | null;
  contact: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  refundStatus: string | null;
  amountRefunded: number;
  captured: boolean;
  createdAt: number | null;
};

export type RazorpayGatewayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
  attempts: number;
  amountPaid: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mapGatewayPayment(raw: unknown): RazorpayGatewayPayment {
  const p = asRecord(raw);
  const error = asRecord(p.error);
  return {
    id: String(p.id ?? ""),
    orderId: p.order_id != null ? String(p.order_id) : null,
    amount: Number(p.amount) || 0,
    currency: String(p.currency ?? "INR").toUpperCase(),
    status: String(p.status ?? ""),
    method: p.method != null ? String(p.method) : null,
    email: p.email != null ? String(p.email) : null,
    contact: p.contact != null ? String(p.contact) : null,
    errorCode: error.code != null ? String(error.code) : p.error_code != null ? String(p.error_code) : null,
    errorDescription:
      error.description != null
        ? String(error.description)
        : p.error_description != null
          ? String(p.error_description)
          : null,
    refundStatus: p.refund_status != null ? String(p.refund_status) : null,
    amountRefunded: Number(p.amount_refunded) || 0,
    captured: Boolean(p.captured),
    createdAt: typeof p.created_at === "number" ? p.created_at : null,
  };
}

function mapGatewayOrder(raw: unknown): RazorpayGatewayOrder {
  const o = asRecord(raw);
  return {
    id: String(o.id ?? ""),
    amount: Number(o.amount) || 0,
    currency: String(o.currency ?? "INR").toUpperCase(),
    status: String(o.status ?? ""),
    receipt: o.receipt != null ? String(o.receipt) : null,
    attempts: Number(o.attempts) || 0,
    amountPaid: Number(o.amount_paid) || 0,
  };
}

function razorpayErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as { error?: { description?: string; code?: string }; message?: string };
  return e.error?.description || e.message || fallback;
}

export function getRazorpayAdminStatus() {
  const keyId = getRazorpayKeyId();
  const configured = isRazorpayConfigured();
  const mode = keyId?.startsWith("rzp_live_") ? "live" : keyId?.startsWith("rzp_test_") ? "test" : "unknown";
  const masked =
    keyId && keyId.length > 12 ? `${keyId.slice(0, 10)}…${keyId.slice(-4)}` : keyId ? `${keyId.slice(0, 6)}…` : null;
  return {
    configured,
    mode,
    keyIdMasked: masked,
    dashboardUrl: "https://dashboard.razorpay.com/app/payments",
  };
}

export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<{ ok: true; payment: RazorpayGatewayPayment } | { ok: false; message: string }> {
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
  }
  const id = paymentId.trim();
  if (!id) return { ok: false, message: "Payment id is required." };
  try {
    const raw = await getClient().payments.fetch(id);
    return { ok: true, payment: mapGatewayPayment(raw) };
  } catch (err) {
    return { ok: false, message: razorpayErrorMessage(err, "Could not fetch Razorpay payment.") };
  }
}

export async function fetchRazorpayOrder(
  orderId: string,
): Promise<{ ok: true; order: RazorpayGatewayOrder } | { ok: false; message: string }> {
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
  }
  const id = orderId.trim();
  if (!id) return { ok: false, message: "Order id is required." };
  try {
    const raw = await getClient().orders.fetch(id);
    return { ok: true, order: mapGatewayOrder(raw) };
  } catch (err) {
    return { ok: false, message: razorpayErrorMessage(err, "Could not fetch Razorpay order.") };
  }
}

export async function fetchRazorpayOrderPayments(
  orderId: string,
): Promise<{ ok: true; payments: RazorpayGatewayPayment[] } | { ok: false; message: string }> {
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
  }
  const id = orderId.trim();
  if (!id) return { ok: false, message: "Order id is required." };
  try {
    const raw = await getClient().orders.fetchPayments(id);
    const list = asRecord(raw).items;
    const payments = Array.isArray(list) ? list.map(mapGatewayPayment) : [];
    return { ok: true, payments };
  } catch (err) {
    return { ok: false, message: razorpayErrorMessage(err, "Could not fetch payments for order.") };
  }
}

export async function createRazorpayRefund(input: {
  paymentId: string;
  amount?: number;
  notes?: Record<string, string>;
}): Promise<
  | { ok: true; refundId: string; amount: number; status: string }
  | { ok: false; message: string }
> {
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Online payments are unavailable. Ask your technical team for help." };
  }
  const paymentId = input.paymentId.trim();
  if (!paymentId) return { ok: false, message: "Razorpay payment id is required." };
  try {
    const payload: { amount?: number; notes?: Record<string, string> } = {};
    if (typeof input.amount === "number" && input.amount > 0) payload.amount = input.amount;
    if (input.notes) payload.notes = input.notes;
    const raw = await getClient().payments.refund(paymentId, payload);
    const refund = asRecord(raw);
    return {
      ok: true,
      refundId: String(refund.id ?? ""),
      amount: Number(refund.amount) || 0,
      status: String(refund.status ?? "processed"),
    };
  } catch (err) {
    return { ok: false, message: razorpayErrorMessage(err, "Razorpay refund failed.") };
  }
}
