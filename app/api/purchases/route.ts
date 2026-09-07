import { NextResponse } from "next/server";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/purchases — list enrollments for the signed-in learner only.
 */
export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const courses = await getPurchasesForLearner(email);
    return NextResponse.json(
      { ok: true, courses },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/purchases GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load enrollments from the database." },
      { status: 503 },
    );
  }
}

/**
 * POST /api/purchases — DISABLED for client enrollment (POC-C-06).
 * Paid access is granted only by verified Razorpay payment / admin grant APIs.
 * Client-supplied learnerEmail, pricePaid, status, or course lists are never trusted here.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Direct enrollment is not allowed. Complete checkout/payment, or ask an administrator to grant access.",
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
