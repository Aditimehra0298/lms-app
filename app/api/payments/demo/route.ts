import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { recordDemoPayment } from "@/lib/server/payment-record-service";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  countryCode?: string;
  currency?: string;
  amount?: number;
  items?: { slug?: string; title?: string; qty?: number; price?: string }[];
};

export async function POST(request: Request) {
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
            qty: Math.max(1, Number(item.qty) || 1),
            price: String(item.price ?? "").trim(),
          }))
          .filter((item) => item.slug)
      : [];

    const result = await recordDemoPayment({
      learnerEmail,
      items,
      amount: Math.max(0, Number(body.amount) || 0),
      currency: body.currency?.trim() || "INR",
      countryCode: body.countryCode?.trim(),
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
