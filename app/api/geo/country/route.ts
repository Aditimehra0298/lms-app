import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { getClientIps } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Guest geo lookup for registration country prefill (IP / CDN headers). */
export async function GET(request: Request) {
  const headerIps = getClientIps(request);
  const geo = await resolveLearnerCountry(request, headerIps);
  const ips = ipsForStorage(headerIps, geo);
  const region = pricingRegionForCountry(geo.countryCode, geo.countryName);

  return NextResponse.json({
    ok: true,
    countryCode: geo.countryCode,
    countryName: geo.countryName,
    source: geo.source,
    ipv4: ips.ipv4,
    ipv6: ips.ipv6,
    region,
  });
}
