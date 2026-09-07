import { NextResponse } from "next/server";
import { finalizeRazorpayPayment } from "@/lib/server/payment-record-service";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

type Body = {
  learnerEmail?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ ok: false, message: "Razorpay is not configured." }, { status: 503 });
  }

  const sessionEmail = requireLearnerSessionEmail(request);
  if (!sessionEmail) return learnerAuthRequiredResponse();

  try {
    const body = (await request.json()) as Body;
    const orderId = body.razorpay_order_id?.trim() ?? "";
    const paymentId = body.razorpay_payment_id?.trim() ?? "";
    const signature = body.razorpay_signature?.trim() ?? "";

    const result = await finalizeRazorpayPayment({
      // Session email only — body.learnerEmail is ignored for authorization.
      learnerEmail: sessionEmail,
      orderId,
      paymentId,
      signature,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId,
      learnerEmail: sessionEmail,
    });
  } catch (err) {
    console.error("[api/payments/razorpay/verify]", err);
    void import("@/lib/server/admin-system-notifications")
      .then(({ pushAdminNotification }) =>
        pushAdminNotification({
          dedupeKey: "runtime:razorpay-verify",
          title: "Payment verification failed",
          detail:
            "A learner completed checkout, but the payment could not be confirmed. They may not have received course access.",
          severity: "critical",
          source: "payments",
          panelHint: "Orders",
        }),
      )
      .catch(() => undefined);
    return NextResponse.json({ ok: false, message: "Could not verify payment." }, { status: 503 });
  }
}
