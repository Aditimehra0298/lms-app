import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { verifyRazorpayPaymentSignature } from "@/lib/server/razorpay-service";
import { isRazorpayConfigured } from "@/lib/server/razorpay-config";

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

  try {
    const body = (await request.json()) as Body;
    const learnerEmail = normalizeLearnerEmail(body.learnerEmail?.trim() ?? "");
    const orderId = body.razorpay_order_id?.trim() ?? "";
    const paymentId = body.razorpay_payment_id?.trim() ?? "";
    const signature = body.razorpay_signature?.trim() ?? "";

    if (!learnerEmail || !orderId || !paymentId || !signature) {
      return NextResponse.json({ ok: false, message: "Missing payment verification fields." }, { status: 400 });
    }

    const valid = verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
    if (!valid) {
      return NextResponse.json({ ok: false, message: "Payment signature verification failed." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId,
      learnerEmail,
    });
  } catch (err) {
    console.error("[api/payments/razorpay/verify]", err);
    return NextResponse.json({ ok: false, message: "Could not verify payment." }, { status: 503 });
  }
}
