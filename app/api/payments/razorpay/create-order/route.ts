import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { createRazorpayOrder, type RazorpayCheckoutItem } from "@/lib/server/razorpay-service";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  countryCode?: string;
  currency?: string;
  items?: RazorpayCheckoutItem[];
};

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as Body;
    const learnerEmail = normalizeLearnerEmail(body.learnerEmail?.trim() ?? "");
    if (!learnerEmail) {
      return NextResponse.json({ ok: false, message: "learnerEmail is required." }, { status: 400 });
    }

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
      items,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      keyId: result.keyId,
      receipt: result.receipt,
      totals: result.totals,
      region: result.region,
    });
  } catch (err) {
    console.error("[api/payments/razorpay/create-order]", err);
    return NextResponse.json(
      { ok: false, message: "Could not create Razorpay order. Check your API keys and try again." },
      { status: 503 },
    );
  }
}
