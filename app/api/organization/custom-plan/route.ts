import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import { requireOrganisationOwner } from "@/lib/server/organization-employee-accounts";
import { orgPlanNote } from "@/lib/server/organization-plan-subscription";
import { customPlanKey, getProposalForToken, isProposalExpired } from "@/lib/server/org-custom-proposal";
import { createRazorpayOrderForAmount } from "@/lib/server/razorpay-service";
import { createPendingRazorpayPayment } from "@/lib/server/payment-record-service";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** GET ?id=&t= — proposal summary for the emailed link. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const found = await getProposalForToken(url.searchParams.get("id") ?? "", url.searchParams.get("t") ?? "").catch(
    () => null,
  );
  if (!found) {
    return NextResponse.json({ ok: false, message: "This proposal link is invalid." }, { status: 404, headers: noStoreJson });
  }
  const { request: req, proposal } = found;
  return NextResponse.json(
    {
      ok: true,
      proposal: {
        companyName: req.companyName,
        contactName: req.name,
        orgEmail: proposal.orgEmail,
        title: proposal.title,
        seats: proposal.seats,
        durationMonths: proposal.durationMonths,
        amountInr: proposal.amountInr,
        message: proposal.message,
        expiresAt: proposal.expiresAt,
        status: proposal.paidAt ? "paid" : isProposalExpired(proposal) ? "expired" : "open",
      },
    },
    { headers: noStoreJson },
  );
}

/** POST { id, t } — the organisation named on the proposal starts Razorpay checkout. */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  let body: { id?: string; t?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStoreJson });
  }

  const found = await getProposalForToken(body.id ?? "", body.t ?? "").catch(() => null);
  if (!found) {
    return NextResponse.json({ ok: false, message: "This proposal link is invalid." }, { status: 404, headers: noStoreJson });
  }
  const { request: req, proposal } = found;
  if (proposal.paidAt) {
    return NextResponse.json({ ok: false, message: "This proposal is already paid." }, { status: 409, headers: noStoreJson });
  }
  if (isProposalExpired(proposal)) {
    return NextResponse.json(
      { ok: false, message: "This proposal has expired. Please ask our team to send a new one." },
      { status: 410, headers: noStoreJson },
    );
  }

  const owner = await requireOrganisationOwner(auth.email);
  if (!owner) {
    return NextResponse.json(
      { ok: false, code: "not-organisation", message: "Sign in with your organisation account to pay." },
      { status: 403, headers: noStoreJson },
    );
  }
  if (owner.email !== proposal.orgEmail) {
    return NextResponse.json(
      {
        ok: false,
        code: "wrong-account",
        message: `This proposal is for ${proposal.orgEmail}. Sign in with that organisation account to pay.`,
      },
      { status: 403, headers: noStoreJson },
    );
  }

  try {
    const key = customPlanKey(req.id);
    const order = await createRazorpayOrderForAmount({
      amountPaise: Math.round(proposal.amountInr * 100),
      currency: "INR",
      notes: { learnerEmail: owner.email, orgPlan: key, seats: String(proposal.seats) },
    });
    if (!order.ok) {
      return NextResponse.json({ ok: false, message: order.message }, { status: 503, headers: noStoreJson });
    }

    const label = `${proposal.title} — ${proposal.seats} employees, ${proposal.durationMonths} months`;
    await createPendingRazorpayPayment({
      learnerEmail: owner.email,
      orderId: order.orderId,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
      items: [{ slug: `org-custom-plan-${req.id}`, title: label, qty: 1, price: String(proposal.amountInr) }],
      countryCode: "IN",
      adminNote: orgPlanNote(key, proposal.seats),
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planTitle: label,
        companyName: owner.companyName,
        email: owner.email,
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[api/organization/custom-plan]", err);
    return NextResponse.json(
      { ok: false, message: "Could not start the payment. Please try again." },
      { status: 503, headers: noStoreJson },
    );
  }
}
