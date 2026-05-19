export type PricingRegion = {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  /** Multiply INR base price to get local amount. */
  rateFromInr: number;
};

const REGION_META: Record<
  string,
  Pick<PricingRegion, "currency" | "currencySymbol" | "locale" | "rateFromInr"> & { name: string }
> = {
  IN: { name: "India", currency: "INR", currencySymbol: "₹", locale: "en-IN", rateFromInr: 1 },
  US: { name: "United States", currency: "USD", currencySymbol: "$", locale: "en-US", rateFromInr: 0.012 },
  GB: { name: "United Kingdom", currency: "GBP", currencySymbol: "£", locale: "en-GB", rateFromInr: 0.0095 },
  AE: { name: "United Arab Emirates", currency: "AED", currencySymbol: "AED ", locale: "en-AE", rateFromInr: 0.044 },
  SA: { name: "Saudi Arabia", currency: "SAR", currencySymbol: "SAR ", locale: "en-SA", rateFromInr: 0.045 },
  AU: { name: "Australia", currency: "AUD", currencySymbol: "A$", locale: "en-AU", rateFromInr: 0.018 },
  CA: { name: "Canada", currency: "CAD", currencySymbol: "C$", locale: "en-CA", rateFromInr: 0.016 },
  SG: { name: "Singapore", currency: "SGD", currencySymbol: "S$", locale: "en-SG", rateFromInr: 0.016 },
  DE: { name: "Germany", currency: "EUR", currencySymbol: "€", locale: "de-DE", rateFromInr: 0.011 },
  FR: { name: "France", currency: "EUR", currencySymbol: "€", locale: "fr-FR", rateFromInr: 0.011 },
};

const DEFAULT_META = REGION_META.US;

export function pricingRegionForCountry(countryCode: string, countryName?: string): PricingRegion {
  const code = countryCode.toUpperCase();
  const meta = REGION_META[code] ?? DEFAULT_META;
  return {
    countryCode: code,
    countryName: countryName?.trim() || meta.name,
    currency: meta.currency,
    currencySymbol: meta.currencySymbol,
    locale: meta.locale,
    rateFromInr: meta.rateFromInr,
  };
}

/** Convert stored INR amount to regional display. */
export function formatInrAsRegional(amountInr: number, region: PricingRegion): string {
  const local = Math.max(1, Math.round(amountInr * region.rateFromInr));
  try {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      maximumFractionDigits: 0,
    }).format(local);
  } catch {
    return `${region.currencySymbol}${local.toLocaleString(region.locale)}`;
  }
}

export function parseStoredPriceString(value: string): number | null {
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Re-format a legacy USD/INR string using regional rules when logged in (INR base inferred). */
export function localizePriceString(priceStr: string, region: PricingRegion): string {
  const amount = parseStoredPriceString(priceStr);
  if (amount === null) return priceStr;
  if (region.countryCode === "IN") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return formatInrAsRegional(amount, region);
}
