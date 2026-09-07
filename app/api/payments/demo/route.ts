import { NextResponse } from "next/server";
import { recordDemoPayment } from "@/lib/server/payment-record-service";
import {
  requireLearnerMutationAuth,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  countryCode?: string;
  currency?: string;
  amount?: number;
  promoCode?: string;
  items?: { slug?: string; title?: string; qty?: number; price?: string }[];
};

/**
 * Demo payment — disabled in production unless ENABLE_DEMO_CHECKOUT=true.
 * Always requires a signed-in learner session (POC-C-06).
 */
export async function POST(request: Request) {
  if (process.env.ENABLE_DEMO_CHECKOUT !== "true") {
    return NextResponse.json(
      { ok: false, message: "Demo checkout is disabled." },
      { status: 403 },
    );
  }

  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;
  const sessionEmail = auth.email;

  try {
    const body = (await request.json()) as Body;

    const items = Array.isArray(body.items)
      ? body.items
          .map((item) => ({
            slug: String(item.slug ?? "").trim(),
            title: String(item.title ?? "").trim(),
            qty: Math.max(1, Number(item.qty) || 1),
            price: String(item.price ?? "").trim(),
          }))
          .filter((item) => item.slug)
      : [];

    const result = await recordDemoPayment({
      learnerEmail: sessionEmail,
      items,
      amount: Math.max(0, Number(body.amount) || 0),
      currency: body.currency?.trim() || "INR",
      countryCode: body.countryCode?.trim(),
      promoCode: body.promoCode?.trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, paymentId: result.paymentId });
  } catch (err) {
    console.error("[api/payments/demo]", err);
    return NextResponse.json({ ok: false, message: "Could not record demo payment." }, { status: 503 });
  }
}
