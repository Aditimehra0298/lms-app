import { NextResponse } from "next/server";
import {
  createPendingRazorpayPayment,
  recordDemoPayment,
} from "@/lib/server/payment-record-service";
import { createRazorpayOrder, type RazorpayCheckoutItem } from "@/lib/server/razorpay-service";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";
import { promoNote } from "@/lib/server/checkout-promo";
import {
  learnerAuthRequiredResponse,
  requireLearnerMutationAuth,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  countryCode?: string;
  currency?: string;
  promoCode?: string;
  items?: RazorpayCheckoutItem[];
};

export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;
  const sessionEmail = auth.email;

  try {
    const body = (await request.json()) as Body;
    const learnerEmail = sessionEmail;

    const items = Array.isArray(body.items)
      ? body.items
          .map((item) => ({
            slug: String(item.slug ?? "").trim(),
            title: String(item.title ?? "").trim(),
            price: String(item.price ?? "").trim(),
            qty: Math.max(1, Number(item.qty) || 1),
          }))
          .filter((item) => item.slug && item.price)
      : [];

    const result = await createRazorpayOrder({
      learnerEmail,
      countryCode: body.countryCode?.trim(),
      currency: body.currency?.trim(),
      promoCode: body.promoCode?.trim(),
      items,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    /** 100% OFF / zero total — enroll after server promo validation (never trust client POST /api/purchases). */
    if (("freeCheckout" in result && result.freeCheckout) || Number(result.amount) <= 0) {
      const enrolled = await recordDemoPayment({
        learnerEmail,
        items: items.map((item) => ({
          slug: item.slug,
          title: item.title || item.slug,
          qty: item.qty,
          price: item.price,
        })),
        amount: 0,
        currency: result.currency,
        countryCode: body.countryCode?.trim(),
        promoCode: result.promoCode,
      });
      if (!enrolled.ok) {
        return NextResponse.json({ ok: false, message: enrolled.message }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        freeCheckout: true,
        orderId: "FREE",
        amount: 0,
        currency: result.currency,
        totals: result.totals,
        promoCode: result.promoCode,
        promoLabel: result.promoLabel,
        region: result.region,
        paymentId: enrolled.paymentId,
        message: "No payment required. Courses unlocked.",
      });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local.",
        },
        { status: 503 },
      );
    }

    await createPendingRazorpayPayment({
      learnerEmail,
      orderId: result.orderId,
      receipt: result.receipt,
      amount: Number(result.amount),
      currency: result.currency,
      items: items.map((item) => ({
        slug: item.slug,
        title: item.title || item.slug,
        qty: item.qty,
        price: item.price,
      })),
      countryCode: body.countryCode?.trim(),
      adminNote: promoNote(result.promoCode ?? "") ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      keyId: result.keyId,
      receipt: result.receipt,
      totals: result.totals,
      promoCode: result.promoCode,
      promoLabel: result.promoLabel,
      region: result.region,
    });
  } catch (err) {
    console.error("[api/payments/razorpay/create-order]", err);
    void import("@/lib/server/admin-system-notifications")
      .then(({ pushAdminNotification }) =>
        pushAdminNotification({
          dedupeKey: "runtime:razorpay-create-order",
          title: "Checkout could not start",
          detail:
            "A learner tried to pay online, but the payment order could not be created. Online checkout may be broken right now.",
          severity: "critical",
          source: "payments",
          panelHint: "Payments",
        }),
      )
      .catch(() => undefined);
    return NextResponse.json(
      { ok: false, message: "Could not create Razorpay order. Check your API keys and try again." },
      { status: 503 },
    );
  }
}
