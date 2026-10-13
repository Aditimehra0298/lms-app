import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import {
  indPlanNote,
  resolveIndividualPlan,
  resolvePlanCategory,
} from "@/lib/server/learner-plan-subscription";
import { createRazorpayOrderForAmount } from "@/lib/server/razorpay-service";
import { createPendingRazorpayPayment } from "@/lib/server/payment-record-service";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** POST { planKey, categorySlug? } — learner starts Razorpay checkout for an annual plan. */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  let body: { planKey?: string; categorySlug?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStoreJson });
  }

  try {
    const plan = await resolveIndividualPlan(body.planKey ?? "");
    if (!plan) {
      return NextResponse.json(
        { ok: false, message: "This plan can't be bought online right now." },
        { status: 404, headers: noStoreJson },
      );
    }
    const category = plan.scope === "category" ? await resolvePlanCategory(body.categorySlug ?? "") : null;
    if (plan.scope === "category" && !category) {
      return NextResponse.json(
        { ok: false, code: "category", message: "Please choose a course category." },
        { status: 400, headers: noStoreJson },
      );
    }

    const order = await createRazorpayOrderForAmount({
      amountPaise: Math.round(plan.amountInr * 100),
      currency: "INR",
      notes: { learnerEmail: auth.email, individualPlan: plan.key, category: category?.slug ?? "all" },
    });
    if (!order.ok) {
      return NextResponse.json({ ok: false, message: order.message }, { status: 503, headers: noStoreJson });
    }

    const label = category ? `${plan.title} — ${category.title}` : plan.title;
    await createPendingRazorpayPayment({
      learnerEmail: auth.email,
      orderId: order.orderId,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
      items: [
        {
          slug: `plan-${plan.key}${category ? `-${category.slug}` : ""}`,
          title: label,
          qty: 1,
          price: String(plan.amountInr),
        },
      ],
      countryCode: "IN",
      adminNote: indPlanNote(plan.key, category?.slug, order.orderId),
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planTitle: label,
        email: auth.email,
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[api/payments/individual-plan-checkout]", err);
    return NextResponse.json(
      { ok: false, message: "Could not start the payment. Please try again." },
      { status: 503, headers: noStoreJson },
    );
  }
}
