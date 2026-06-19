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
