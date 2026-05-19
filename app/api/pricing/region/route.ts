import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, showPrices: false, message: "email required" }, { status: 400 });
  }

  try {
    const user = await prisma.lmsUser.findUnique({ where: { email } });
    if (user?.countryCode) {
      const region = pricingRegionForCountry(user.countryCode, user.countryName ?? undefined);
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region,
        ipv4: user.ipv4,
        ipv6: user.ipv6,
      });
    }
  } catch {
    /* fall through */
  }

  const fallback = pricingRegionForCountry("IN", "India");
  return NextResponse.json({
    ok: true,
    showPrices: true,
    region: fallback,
    note: "default_region",
  });
}
