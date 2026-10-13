import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import { requireOrganisationOwner } from "@/lib/server/organization-employee-accounts";
import {
  isOrgPlanRenewal,
  orgPlanNote,
  resolveOrgCheckoutPlan,
} from "@/lib/server/organization-plan-subscription";
import { createRazorpayOrderForAmount } from "@/lib/server/razorpay-service";
import { createPendingRazorpayPayment } from "@/lib/server/payment-record-service";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** POST { planKey, seats } — organisation starts Razorpay checkout for a team plan tier. */
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

  let body: { planKey?: string; seats?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStoreJson });
  }

  try {
    const seatsWanted = Number(body.seats);
    const plan = await resolveOrgCheckoutPlan(
      body.planKey ?? "",
      Number.isFinite(seatsWanted) && seatsWanted > 0 ? seatsWanted : undefined,
    );
    if (!plan) {
      return NextResponse.json(
        { ok: false, message: "This plan can't be bought online. Please contact sales." },
        { status: 404, headers: noStoreJson },
      );
    }

    const renewal = await isOrgPlanRenewal(owner.email, plan.seats);
    const amountInr = renewal ? plan.renewalAmountInr : plan.amountInr;
    const order = await createRazorpayOrderForAmount({
      amountPaise: Math.round(amountInr * 100),
      currency: "INR",
      notes: {
        learnerEmail: owner.email,
        orgPlan: plan.key,
        seats: String(plan.seats),
        renewal: renewal ? "yes" : "no",
      },
    });
    if (!order.ok) {
      return NextResponse.json({ ok: false, message: order.message }, { status: 503, headers: noStoreJson });
    }

    const label = `${plan.title} — up to ${plan.seats} employees${renewal ? " (renewal)" : ""}`;
    await createPendingRazorpayPayment({
      learnerEmail: owner.email,
      orderId: order.orderId,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
      items: [{ slug: `org-plan-${plan.key}-${plan.seats}`, title: label, qty: 1, price: String(amountInr) }],
      countryCode: "IN",
      adminNote: orgPlanNote(plan.key, plan.seats),
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planTitle: label,
        seats: plan.seats,
        renewal,
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
