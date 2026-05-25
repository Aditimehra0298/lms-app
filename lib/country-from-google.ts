import type { GeoCountry } from "@/lib/geo-country";
import { countryDisplayName, isValidCountryCode } from "@/lib/iso-country-list";

/** Parse Google profile `locale` (e.g. en-US, en_IN) into a country code. */
export function countryFromGoogleLocale(locale?: string | null): GeoCountry | null {
  if (!locale?.trim()) return null;

  const normalized = locale.trim().replace(/_/g, "-");
  const parts = normalized.split("-");

  let code: string | null = null;
  if (parts.length >= 2) {
    const region = parts[parts.length - 1]!.toUpperCase();
    if (/^[A-Z]{2}$/.test(region)) code = region;
  } else if (parts.length === 1 && /^[A-Z]{2}$/i.test(parts[0]!)) {
    code = parts[0]!.toUpperCase();
  }

  if (!code || !isValidCountryCode(code)) return null;

  return {
    countryCode: code,
    countryName: countryDisplayName(code),
  };
}
