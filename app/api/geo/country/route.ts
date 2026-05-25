import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { resolveLearnerCountry } from "@/lib/server/resolve-learner-country";
import { getClientIps } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Guest geo lookup for registration country prefill (IP / CDN headers). */
export async function GET(request: Request) {
  const ips = getClientIps(request);
  const geo = await resolveLearnerCountry(request, ips);
  const region = pricingRegionForCountry(geo.countryCode, geo.countryName);

  return NextResponse.json({
    ok: true,
    countryCode: geo.countryCode,
    countryName: geo.countryName,
    source: geo.source,
    region,
  });
}
