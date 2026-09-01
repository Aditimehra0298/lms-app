import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";
import { prisma } from "@/lib/prisma";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { getClientIps } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/** Save learner country for localized pricing (manual override from region panel). */
export async function POST(request: Request) {
  let body: { email?: string; countryCode?: string };
  try {
    body = (await request.json()) as { email?: string; countryCode?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.countryCode?.trim().toUpperCase();
  if (!email || !code) {
    return NextResponse.json(
      { ok: false, message: "email and countryCode are required" },
      { status: 400 },
    );
  }

  const region = pricingRegionForCountry(code, countryDisplayName(code));

  try {
    await prisma.lmsUser.update({
      where: { email },
      data: {
        countryCode: region.countryCode,
        countryName: region.countryName,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Could not save country" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, showPrices: true, region, countrySource: "manual" });
}

/** Load pricing country from MySQL; if missing, detect from IP / headers and save. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, showPrices: false, message: "email required" }, { status: 400 });
  }

  const requestIps = getClientIps(request);

  try {
    const user = await prisma.lmsUser.findUnique({ where: { email } });
    if (!user) {
      const geo = await resolveLearnerCountry(request, requestIps);
      const ips = ipsForStorage(requestIps, geo);
      const region = pricingRegionForCountry(geo.countryCode, geo.countryName);
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region,
        ipv4: ips.ipv4,
        ipv6: ips.ipv6,
        countrySource: geo.source === "default" ? "default" : geo.source,
      });
    }

    if (user.countryCode) {
      const geo = await resolveLearnerCountry(request, requestIps);
      const ips = ipsForStorage(requestIps, geo);
      const region = pricingRegionForCountry(user.countryCode, user.countryName ?? undefined);
      await prisma.lmsUser
        .update({
          where: { email },
          data: {
            ipv4: ips.ipv4 ?? user.ipv4 ?? undefined,
            ipv6: ips.ipv6 ?? user.ipv6 ?? undefined,
          },
        })
        .catch(() => null);
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region,
        ipv4: ips.ipv4 ?? user.ipv4,
        ipv6: ips.ipv6 ?? user.ipv6,
        countrySource: "stored",
      });
    }

    const geo = await resolveLearnerCountry(request, {
      ipv4: requestIps.ipv4 ?? user.ipv4,
      ipv6: requestIps.ipv6 ?? user.ipv6,
    });
    const ips = ipsForStorage(requestIps, geo);
    const region = pricingRegionForCountry(geo.countryCode, geo.countryName);

    await prisma.lmsUser.update({
      where: { email },
      data: {
        countryCode: region.countryCode,
        countryName: region.countryName,
        ipv4: ips.ipv4 ?? user.ipv4 ?? undefined,
        ipv6: ips.ipv6 ?? user.ipv6 ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      showPrices: true,
      region,
      ipv4: ips.ipv4 ?? user.ipv4,
      ipv6: ips.ipv6 ?? user.ipv6,
      countrySource: geo.source,
    });
  } catch (err) {
    console.error("[pricing/region GET]", err);
  }

  const fallback = pricingRegionForCountry("IN", "India");
  return NextResponse.json({
    ok: true,
    showPrices: true,
    region: fallback,
    countrySource: "default",
  });
}
