import type { CourseRegionalPriceRow, ManagedCourse } from "@/lib/content-schema";
import { parseStoredPriceString, pricingRegionForCountry, type PricingRegion } from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";
import { detectCurrencyFromPrice } from "@/lib/price-currency-detect";

export type ResolvedCoursePrices = {
  price: string;
  oldPrice: string;
  discountPercent: number | null;
  /** True when a regional row matched the learner country. */
  isRegionalOverride: boolean;
};

/** Common markets — quick-add in admin Pricing tab. */
export const PRICING_MARKET_PRESETS: { code: string; currencyHint: string; currencyCode: string }[] = [
  { code: "IN", currencyHint: "₹", currencyCode: "INR" },
  { code: "US", currencyHint: "$", currencyCode: "USD" },
  { code: "GB", currencyHint: "£", currencyCode: "GBP" },
  { code: "AE", currencyHint: "AED", currencyCode: "AED" },
  { code: "SA", currencyHint: "SAR", currencyCode: "SAR" },
  { code: "AU", currencyHint: "A$", currencyCode: "AUD" },
  { code: "CA", currencyHint: "C$", currencyCode: "CAD" },
  { code: "SG", currencyHint: "S$", currencyCode: "SGD" },
  { code: "DE", currencyHint: "€", currencyCode: "EUR" },
  { code: "FR", currencyHint: "€", currencyCode: "EUR" },
  { code: "PK", currencyHint: "₨", currencyCode: "PKR" },
  { code: "BD", currencyHint: "৳", currencyCode: "BDT" },
  { code: "NG", currencyHint: "₦", currencyCode: "NGN" },
  { code: "ZA", currencyHint: "R", currencyCode: "ZAR" },
];

export function computeDiscountPercent(saleStr: string, listStr: string): number | null {
  const sale = parseStoredPriceString(saleStr);
  const list = parseStoredPriceString(listStr);
  if (sale === null || list === null || list <= 0 || sale >= list) return null;
  return Math.round((1 - sale / list) * 100);
}

function findRegionalRow(
  rows: CourseRegionalPriceRow[] | undefined,
  countryCode: string,
): CourseRegionalPriceRow | undefined {
  const code = countryCode.trim().toUpperCase();
  return rows?.find((r) => r.countryCode.trim().toUpperCase() === code);
}

/** Format a regional admin price with the country's currency sign when missing. */
export function formatPriceForCountry(priceStr: string, countryCode: string): string {
  const trimmed = priceStr.trim();
  if (!trimmed) return trimmed;
  if (detectCurrencyFromPrice(trimmed)) return trimmed;

  const amount = parseStoredPriceString(trimmed);
  if (amount === null) return trimmed;

  const region = pricingRegionForCountry(countryCode);
  if (region.countryCode === "IN") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  try {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${region.currencySymbol}${amount.toLocaleString(region.locale)}`;
  }
}

/** Resolve sale + list price for a learner region (regional override or global + FX). */
export function resolveCoursePrices(
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices">,
  region: PricingRegion | null,
): ResolvedCoursePrices {
  const countryCode = region?.countryCode ?? "IN";
  const regional = findRegionalRow(course.regionalPrices, countryCode);

  if (regional?.price?.trim()) {
    const price = formatPriceForCountry(regional.price.trim(), countryCode);
    const oldPrice = regional.oldPrice?.trim()
      ? formatPriceForCountry(regional.oldPrice.trim(), countryCode)
      : "";
    return {
      price,
      oldPrice,
      discountPercent: computeDiscountPercent(price, oldPrice),
      isRegionalOverride: true,
    };
  }

  const globalSale = course.price?.trim() ?? "";
  const globalList = course.oldPrice?.trim() ?? "";
  const discountPercent = computeDiscountPercent(globalSale, globalList);

  // Keep admin-entered global prices as-is (same string on every LMS page).
  // Regional rows above already apply country-specific overrides.
  return {
    price: globalSale,
    oldPrice: globalList,
    discountPercent,
    isRegionalOverride: false,
  };
}

export function sanitizeRegionalPrices(
  rows: CourseRegionalPriceRow[] | undefined,
): CourseRegionalPriceRow[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: CourseRegionalPriceRow[] = [];
  for (const row of rows) {
    const code = row?.countryCode?.trim().toUpperCase();
    const price = row?.price?.trim();
    if (!code || !/^[A-Z]{2}$/.test(code) || !price || seen.has(code)) continue;
    seen.add(code);
    out.push({
      countryCode: code,
      price,
      oldPrice: row.oldPrice?.trim() ?? "",
    });
  }
  return out;
}

export function marketLabel(countryCode: string): string {
  return countryDisplayName(countryCode);
}
