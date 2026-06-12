import { NextResponse } from "next/server";
import { getPublicRazorpayConfig } from "@/lib/server/razorpay-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicRazorpayConfig();
  return NextResponse.json({
    ok: true,
    configured: config.configured,
    keyId: config.configured ? config.keyId : null,
    multiCurrency: config.multiCurrency,
  });
}
