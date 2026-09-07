import { NextResponse } from "next/server";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";
import { prisma } from "@/lib/prisma";
import { resolveLearnerCountry, ipsForStorage } from "@/lib/server/resolve-learner-country";
import { getClientIps } from "@/lib/request-ip";
import {
  learnerAuthRequiredResponse,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";

export const dynamic = "force-dynamic";

/** Save learner country for localized pricing (manual override from region panel). */
export async function POST(request: Request) {
  const sessionEmail = requireLearnerSessionEmail(request);
  if (!sessionEmail) return learnerAuthRequiredResponse();

  let body: { email?: string; countryCode?: string };
  try {
    body = (await request.json()) as { email?: string; countryCode?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const code = body.countryCode?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false, message: "countryCode is required" }, { status: 400 });
  }

  const region = pricingRegionForCountry(code, countryDisplayName(code));
  const email = sessionEmail;

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

/**
 * Pricing region for the signed-in learner, or anonymous geo-only (no PII / stored IP).
 * ?email= is ignored — never load another user's stored IP (POC-C-04).
 */
export async function GET(request: Request) {
  const sessionEmail = requireLearnerSessionEmail(request);
  const requestIps = getClientIps(request);

  // Anonymous: IP geo only — do not look up users or return stored ipv4 from DB.
  if (!sessionEmail) {
    try {
      const geo = await resolveLearnerCountry(request, requestIps);
      const region = pricingRegionForCountry(geo.countryCode, geo.countryName);
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region,
        countrySource: geo.source === "default" ? "default" : geo.source,
      });
    } catch {
      const fallback = pricingRegionForCountry("IN", "India");
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region: fallback,
        countrySource: "default",
      });
    }
  }

  const email = sessionEmail;

  try {
    const user = await prisma.lmsUser.findUnique({ where: { email } });
    if (!user) {
      const geo = await resolveLearnerCountry(request, requestIps);
      const region = pricingRegionForCountry(geo.countryCode, geo.countryName);
      return NextResponse.json({
        ok: true,
        showPrices: true,
        region,
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
