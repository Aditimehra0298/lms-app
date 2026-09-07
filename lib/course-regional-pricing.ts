import type { CourseRegionalPriceRow, ManagedCourse } from "@/lib/content-schema";
import {
  currencyCodeFromPriceString,
  formatPriceAsEntered,
  parseStoredPriceString,
  pricingRegionForCountry,
  type PricingRegion,
} from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";
import { standardRegionalRowForCountry } from "@/lib/standard-course-pricing";

export type ResolvedCoursePrices = {
  price: string;
  oldPrice: string;
  discountPercent: number | null;
  /** True when a regional row matched the learner country. */
  isRegionalOverride: boolean;
  /** ISO currency of the displayed admin price (INR, USD, …). */
  currency: string;
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
  if (!code || !rows?.length) return undefined;
  const exact = rows.find((r) => (r.countryCode ?? "").trim().toUpperCase() === code);
  if (exact) return exact;
  if (code === "IN") {
    return rows.find((r) => /india/i.test(`${r.countryCode ?? ""}`));
  }
  return undefined;
}

/** Format a regional admin price, keeping the currency typed in Admin. */
export function formatPriceForCountry(priceStr: string, countryCode: string): string {
  return formatPriceAsEntered(priceStr, countryCode);
}

function currencyOfPrice(price: string, countryCode: string): string {
  return currencyCodeFromPriceString(price) ?? (countryCode === "IN" ? "INR" : "USD");
}

function resolvedFromRow(
  row: Pick<CourseRegionalPriceRow, "price" | "oldPrice">,
  countryCode: string,
  isRegionalOverride: boolean,
): ResolvedCoursePrices {
  const price = formatPriceForCountry(row.price.trim(), countryCode);
  const oldPrice = row.oldPrice?.trim() ? formatPriceForCountry(row.oldPrice.trim(), countryCode) : "";
  return {
    price,
    oldPrice,
    discountPercent: computeDiscountPercent(price, oldPrice),
    isRegionalOverride,
    currency: currencyOfPrice(price, countryCode),
  };
}

/**
 * Learner country row from Admin/DB when set (India ₹, US $, …).
 * Falls back to the designed standard country sheet, then global USD.
 */
export function resolveCoursePrices(
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices">,
  region: PricingRegion | null,
): ResolvedCoursePrices {
  const countryCode = region?.countryCode ?? "IN";
  const regional = findRegionalRow(course.regionalPrices, countryCode);

  if (regional?.price?.trim()) {
    return resolvedFromRow(regional, countryCode, true);
  }

  const standard = standardRegionalRowForCountry(countryCode);
  if (standard?.price?.trim()) {
    return resolvedFromRow(standard, countryCode, true);
  }

  const globalSale = formatPriceAsEntered(course.price?.trim() ?? "", "US");
  const globalList = course.oldPrice?.trim() ? formatPriceAsEntered(course.oldPrice.trim(), "US") : "";
  return {
    price: globalSale,
    oldPrice: globalList,
    discountPercent: computeDiscountPercent(globalSale, globalList),
    isRegionalOverride: false,
    currency: currencyOfPrice(globalSale, "US"),
  };
}

/** Region used to format cart/checkout money so it matches the visible admin price. */
export function displayRegionForResolvedPrice(
  resolved: Pick<ResolvedCoursePrices, "currency">,
  learnerRegion: PricingRegion | null,
): PricingRegion {
  if (resolved.currency === "INR") return pricingRegionForCountry("IN");
  if (resolved.currency === "USD") return pricingRegionForCountry("US");
  if (learnerRegion?.currency === resolved.currency) return learnerRegion;
  return learnerRegion ?? pricingRegionForCountry("US");
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
      basePrice: row.basePrice?.trim() ?? "",
    });
  }
  return out;
}

export function marketLabel(countryCode: string): string {
  return countryDisplayName(countryCode);
}
