import { isOrganisationLearner, readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import { openRazorpayCheckout, verifyRazorpayPaymentOnServer } from "@/lib/razorpay-client";
import { readJsonResponse } from "@/lib/safe-json";

/** Query param that resumes plan checkout after the organisation signs in. */
export const ORG_PLAN_CHECKOUT_PARAM = "orgPlanCheckout";

export type OrgPlanCheckoutResult =
  | { status: "login" }
  | { status: "not-organisation" }
  | { status: "paid" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function startOrgPlanCheckout(planKey: string): Promise<OrgPlanCheckoutResult> {
  if (!isLearnerLoggedIn() || !getLearnerEmail()) return { status: "login" };
  if (!isOrganisationLearner(readLearnerProfileFromStorage())) return { status: "not-organisation" };

  const res = await fetch("/api/organization/plan-checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planKey }),
  });
  const data = await readJsonResponse(res, {} as {
    ok?: boolean;
    code?: string;
    message?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    planTitle?: string;
    seats?: number;
    companyName?: string;
    email?: string;
  });
  if (res.status === 401) return { status: "login" };
  if (data.code === "not-organisation") return { status: "not-organisation" };
  if (!res.ok || !data.ok || !data.orderId || !data.keyId || !data.amount || !data.currency) {
    return { status: "error", message: data.message ?? "Could not start the payment." };
  }

  let response;
  try {
    response = await openRazorpayCheckout({
      keyId: data.keyId,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      description: `${data.planTitle ?? "Team plan"} · ${data.seats ?? ""} seats`,
      prefill: { name: data.companyName, email: data.email },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment cancelled.";
    if (/cancel/i.test(message)) return { status: "cancelled" };
    return { status: "error", message };
  }

  const verified = await verifyRazorpayPaymentOnServer({
    learnerEmail: data.email ?? getLearnerEmail() ?? "",
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature,
  });
  if (!verified.ok) {
    return {
      status: "error",
      message: `${verified.message ?? "Payment could not be confirmed."} If money was deducted, contact support with payment id ${response.razorpay_payment_id}.`,
    };
  }
  return { status: "paid" };
}

export function orgPlanLoginHref(planKey: string): string {
  const next = `/?${ORG_PLAN_CHECKOUT_PARAM}=${encodeURIComponent(planKey)}#pricing`;
  return `/account?mode=login&type=organisation&next=${encodeURIComponent(next)}`;
}
