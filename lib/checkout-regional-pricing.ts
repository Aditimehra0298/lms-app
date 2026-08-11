import {
  parseStoredPriceString,
  pricingRegionForCountry,
  type PricingRegion,
} from "@/lib/country-pricing";
import { resolveCoursePrices } from "@/lib/course-regional-pricing";
import type { ManagedCourse } from "@/lib/content-schema";
import { computeCheckoutTotals, type CheckoutLineItem, type CheckoutTotals } from "@/lib/checkout-totals";

export type CheckoutPricedItem = {
  slug: string;
  price: string;
  qty: number;
};

/** Numeric unit price in the learner's currency (matches catalog + regional rules). */
export function resolveCheckoutItemUnitAmount(
  slug: string,
  fallbackPrice: string,
  catalog: ManagedCourse[],
  region: PricingRegion,
): number {
  const course = catalog.find((c) => c.slug === slug);
  if (course) {
    const resolved = resolveCoursePrices(course, region);
    const parsed = parseStoredPriceString(resolved.price);
    if (parsed !== null) return parsed;
  }
  const inrBase = parseStoredPriceString(fallbackPrice);
  if (inrBase === null) return 0;
  if (region.countryCode === "IN") return inrBase;
  return Math.max(1, Math.round(inrBase * region.rateFromInr));
}

export function buildRegionalCheckoutLineItems(
  items: CheckoutPricedItem[],
  catalog: ManagedCourse[],
  region: PricingRegion,
): CheckoutLineItem[] {
  return items.map((item) => ({
    qty: item.qty,
    price: String(resolveCheckoutItemUnitAmount(item.slug, item.price, catalog, region)),
  }));
}

export function computeRegionalCheckoutTotals(
  items: CheckoutPricedItem[],
  catalog: ManagedCourse[],
  region: PricingRegion,
  extraDiscount = 0,
): CheckoutTotals {
  return computeCheckoutTotals(buildRegionalCheckoutLineItems(items, catalog, region), extraDiscount);
}

export function formatCheckoutMoney(amount: number, region: PricingRegion): string {
  const zeroDecimal = new Set(["JPY", "KRW", "VND"]);
  const fractionDigits = zeroDecimal.has(region.currency) ? 0 : 2;
  try {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${region.currencySymbol}${amount.toLocaleString(region.locale)}`;
  }
}

export function pricingRegionFromCountryCode(countryCode: string, countryName?: string): PricingRegion {
  return pricingRegionForCountry(countryCode.trim().toUpperCase() || "IN", countryName);
}
