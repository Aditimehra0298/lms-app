import { pricingRegionForCountry, type PricingRegion } from "@/lib/country-pricing";

type ExistingUserCountry = {
  countryCode: string | null;
  countryName: string | null;
} | null;

/** Country fields to write on login/register update. */
export function countryUpdateFields(
  action: "login" | "register",
  hasManualCountry: boolean,
  region: PricingRegion,
  existing: ExistingUserCountry,
): { countryCode?: string; countryName?: string } {
  if (action === "register" || hasManualCountry || !existing?.countryCode) {
    return { countryCode: region.countryCode, countryName: region.countryName };
  }
  return {};
}

/** Pricing region returned to the client (keeps stored country on login when not overridden). */
export function pricingRegionForAuthResponse(
  action: "login" | "register",
  hasManualCountry: boolean,
  resolved: PricingRegion,
  existing: ExistingUserCountry,
): PricingRegion {
  if (
    action === "login" &&
    !hasManualCountry &&
    existing?.countryCode
  ) {
    return pricingRegionForCountry(existing.countryCode, existing.countryName ?? undefined);
  }
  return resolved;
}
