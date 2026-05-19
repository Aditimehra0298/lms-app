import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { countryFromRequestHeaders, lookupCountryFromIp } from "@/lib/geo-country";
import { prisma } from "@/lib/prisma";
import { getClientIps, primaryGeoIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  name?: string;
  action?: "login" | "register";
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
  }

  const ips = getClientIps(request);
  const headerCountry = countryFromRequestHeaders(request);
  const geoIp = primaryGeoIp(ips);
  const geo =
    headerCountry ?? (await lookupCountryFromIp(geoIp));
  const region = pricingRegionForCountry(geo.countryCode, geo.countryName);

  let dbSaved = false;
  try {
    await prisma.lmsUser.upsert({
      where: { email },
      create: {
        email,
        name: body.name?.trim() || null,
        role: email === "admin@gmail.com" ? "admin" : "learner",
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        countryCode: region.countryCode,
        countryName: region.countryName,
        lastLoginAt: new Date(),
      },
      update: {
        name: body.name?.trim() || undefined,
        ipv4: ips.ipv4 ?? undefined,
        ipv6: ips.ipv6 ?? undefined,
        countryCode: region.countryCode,
        countryName: region.countryName,
        lastLoginAt: new Date(),
      },
    });
    dbSaved = true;
  } catch {
    dbSaved = false;
  }

  return NextResponse.json({
    ok: true,
    dbSaved,
    ipv4: ips.ipv4,
    ipv6: ips.ipv6,
    region,
    action: body.action ?? "login",
  });
}
