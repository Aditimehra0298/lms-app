import { currencyForCountry } from "@/lib/currency-by-country";
import { countryDisplayName } from "@/lib/iso-country-list";

export type PricingRegion = {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  /** Multiply INR base price to get local amount. */
  rateFromInr: number;
};

/** INR → local currency multipliers (approximate; admin prices stored in INR). */
const RATE_BY_CURRENCY: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  SAR: 0.045,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  JPY: 1.8,
  CNY: 0.086,
  HKD: 0.094,
  TWD: 0.38,
  KRW: 16,
  CHF: 0.011,
  NZD: 0.02,
  MXN: 0.21,
  BRL: 0.06,
  ZAR: 0.22,
  NGN: 18,
  KES: 1.55,
  EGP: 0.37,
  PKR: 3.35,
  BDT: 1.4,
  LKR: 3.6,
  NPR: 1.6,
  THB: 0.42,
  MYR: 0.056,
  IDR: 190,
  PHP: 0.68,
  VND: 300,
  TRY: 0.41,
  PLN: 0.048,
  SEK: 0.13,
  NOK: 0.13,
  DKK: 0.083,
  CZK: 0.28,
  HUF: 4.3,
  RON: 0.055,
  ILS: 0.044,
  QAR: 0.044,
  KWD: 0.0037,
  BHD: 0.0045,
  OMR: 0.0046,
  RUB: 1.1,
  UAH: 0.49,
  ARS: 10,
  CLP: 11,
  COP: 48,
  PEN: 0.045,
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

function localeForCountry(countryCode: string, currency: string): string {
  const preset = REGION_META[countryCode];
  if (preset) return preset.locale;
  try {
    return new Intl.Locale(`en-${countryCode}`).toString();
  } catch {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().locale;
    } catch {
      return "en-US";
    }
  }
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(1);
    const sym = parts.find((p) => p.type === "currency")?.value;
    if (sym) return sym;
  } catch {
    /* fall through */
  }
  return `${currency} `;
}

export function pricingRegionForCountry(countryCode: string, countryName?: string): PricingRegion {
  const code = countryCode.toUpperCase();
  const preset = REGION_META[code];
  if (preset) {
    return {
      countryCode: code,
      countryName: countryName?.trim() || preset.name,
      currency: preset.currency,
      currencySymbol: preset.currencySymbol,
      locale: preset.locale,
      rateFromInr: preset.rateFromInr,
    };
  }

  const currency = currencyForCountry(code);
  const rate = RATE_BY_CURRENCY[currency] ?? RATE_BY_CURRENCY.USD;
  const locale = localeForCountry(code, currency);

  return {
    countryCode: code,
    countryName: countryName?.trim() || countryDisplayName(code),
    currency,
    currencySymbol: currencySymbol(currency, locale),
    locale,
    rateFromInr: rate,
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

/** Re-format a price string for a region without corrupting explicit currencies ($, £, €, etc.). */
export function localizePriceString(priceStr: string, region: PricingRegion): string {
  const trimmed = priceStr.trim();
  if (!trimmed) return trimmed;

  const hasExplicitCurrency =
    /[₹$€£]|A\$|C\$|S\$|USD|INR|EUR|GBP|AED|SAR|AUD|CAD|SGD|PKR|BDT|NGN/i.test(trimmed);
  const looksInr = /₹|\bINR\b/i.test(trimmed);

  if (hasExplicitCurrency) {
    // Only FX-convert when the stored amount is INR and the learner is not in India.
    if (looksInr && region.countryCode !== "IN") {
      const amount = parseStoredPriceString(trimmed);
      if (amount === null) return trimmed;
      return formatInrAsRegional(amount, region);
    }
    return trimmed;
  }

  const amount = parseStoredPriceString(trimmed);
  if (amount === null) return trimmed;
  if (region.countryCode === "IN") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return formatInrAsRegional(amount, region);
}
