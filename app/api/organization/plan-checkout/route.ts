import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import { requireOrganisationOwner } from "@/lib/server/organization-employee-accounts";
import { ORG_PLAN_NOTE_PREFIX, resolveOrgCheckoutPlan } from "@/lib/server/organization-plan-subscription";
import { createRazorpayOrderForAmount } from "@/lib/server/razorpay-service";
import { createPendingRazorpayPayment } from "@/lib/server/payment-record-service";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** POST { planKey } — organisation starts Razorpay checkout for a team plan. */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  const owner = await requireOrganisationOwner(auth.email);
  if (!owner) {
    return NextResponse.json(
      { ok: false, code: "not-organisation", message: "Sign in with your organisation account to buy a team plan." },
      { status: 403, headers: noStoreJson },
    );
  }

  let body: { planKey?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStoreJson });
  }

  try {
    const plan = await resolveOrgCheckoutPlan(body.planKey ?? "");
    if (!plan) {
      return NextResponse.json(
        { ok: false, message: "This plan can't be bought online. Please contact sales." },
        { status: 404, headers: noStoreJson },
      );
    }

    const amountPaise = Math.round(plan.amountInr * 100);
    const order = await createRazorpayOrderForAmount({
      amountPaise,
      currency: "INR",
      notes: {
        learnerEmail: owner.email,
        orgPlan: plan.key,
        seats: String(plan.seats),
      },
    });
    if (!order.ok) {
      return NextResponse.json({ ok: false, message: order.message }, { status: 503, headers: noStoreJson });
    }

    await createPendingRazorpayPayment({
      learnerEmail: owner.email,
      orderId: order.orderId,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
      items: [
        { slug: `org-plan-${plan.key}`, title: `${plan.title} (${plan.seats} seats)`, qty: 1, price: String(plan.amountInr) },
      ],
      countryCode: "IN",
      adminNote: `${ORG_PLAN_NOTE_PREFIX}${plan.key}`,
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planTitle: plan.title,
        seats: plan.seats,
        companyName: owner.companyName,
        email: owner.email,
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[api/organization/plan-checkout]", err);
    return NextResponse.json(
      { ok: false, message: "Could not start the payment. Please try again." },
      { status: 503, headers: noStoreJson },
    );
  }
}
