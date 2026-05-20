import { countryFromGoogleLocale } from "@/lib/country-from-google";
import { countryDisplayName, isValidCountryCode } from "@/lib/iso-country-list";
import { countryFromRequestHeaders, lookupCountryFromIp, type GeoCountry } from "@/lib/geo-country";
import { primaryGeoIp } from "@/lib/request-ip";

export type CountrySource = "manual" | "google" | "headers" | "ip" | "default";

export type ResolvedCountry = GeoCountry & { source: CountrySource };

export type CountryHints = {
  countryCode?: string | null;
  countryName?: string | null;
  googleLocale?: string | null;
};

export async function resolveLearnerCountry(
  request: Request,
  ips: { ipv4: string | null; ipv6: string | null },
  hints?: CountryHints,
): Promise<ResolvedCountry> {
  const manual = hints?.countryCode?.trim().toUpperCase();
  if (manual && isValidCountryCode(manual)) {
    return {
      countryCode: manual,
      countryName: hints?.countryName?.trim() || countryDisplayName(manual),
      source: "manual",
    };
  }

  const fromGoogle = countryFromGoogleLocale(hints?.googleLocale);
  if (fromGoogle) {
    return { ...fromGoogle, source: "google" };
  }

  const fromHeaders = countryFromRequestHeaders(request);
  if (fromHeaders) {
    return {
      countryCode: fromHeaders.countryCode,
      countryName: countryDisplayName(fromHeaders.countryCode),
      source: "headers",
    };
  }

  const geoIp = primaryGeoIp(ips);
  const fromIp = await lookupCountryFromIp(geoIp);
  return { ...fromIp, source: geoIp ? "ip" : "default" };
}
