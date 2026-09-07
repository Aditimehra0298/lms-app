import type { CourseRegionalPriceRow, ManagedCourse } from "@/lib/content-schema";

/** Default USD prices shown on Admin → Pricing when no country row matches. */
export const STANDARD_GLOBAL_PRICES = {
  /** Standard / sale price (what the learner pays). */
  price: "$49.00",
  /** Rack / list price (strikethrough). */
  oldPrice: "$79.00",
  /** Internal floor — coupons must not go below this. */
  basePrice: "$39.00",
} as const;

/**
 * Country overrides from the approved pricing sheet:
 * India, United States, UAE, United Kingdom, Australia.
 */
export const STANDARD_REGIONAL_PRICES: CourseRegionalPriceRow[] = [
  { countryCode: "IN", price: "₹4,199", oldPrice: "₹6,699", basePrice: "₹3,299" },
  { countryCode: "US", price: "$49.00", oldPrice: "$79.00", basePrice: "$39.00" },
  { countryCode: "AE", price: "AED 179.00", oldPrice: "AED 289.00", basePrice: "AED 139.00" },
  { countryCode: "GB", price: "£39.00", oldPrice: "£59.00", basePrice: "£29.00" },
  { countryCode: "AU", price: "A$79.00", oldPrice: "A$129.00", basePrice: "A$59.00" },
];

export function applyStandardCoursePricing<T extends Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices"> & { basePrice?: string }>(
  course: T,
): T {
  return {
    ...course,
    price: STANDARD_GLOBAL_PRICES.price,
    oldPrice: STANDARD_GLOBAL_PRICES.oldPrice,
    basePrice: STANDARD_GLOBAL_PRICES.basePrice,
    regionalPrices: STANDARD_REGIONAL_PRICES.map((row) => ({ ...row })),
  };
}

/**
 * Keep admin/DB country rows; fill any missing standard markets so country pricing stays active.
 */
export function ensureCourseRegionalPricing<
  T extends Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices"> & { basePrice?: string },
>(course: T): T {
  const existing = Array.isArray(course.regionalPrices) ? course.regionalPrices : [];
  const byCode = new Map<string, CourseRegionalPriceRow>();
  for (const row of existing) {
    const code = (row.countryCode ?? "").trim().toUpperCase();
    if (!code || !row.price?.trim()) continue;
    byCode.set(code, {
      countryCode: code,
      price: row.price.trim(),
      oldPrice: row.oldPrice?.trim() || undefined,
      basePrice: row.basePrice?.trim() || undefined,
    });
  }
  for (const std of STANDARD_REGIONAL_PRICES) {
    if (!byCode.has(std.countryCode)) {
      byCode.set(std.countryCode, { ...std });
    }
  }

  const regionalPrices = [...byCode.values()];
  const hasSale = Boolean(course.price?.trim());
  const hasList = Boolean(course.oldPrice?.trim());
  const hasBase = Boolean(course.basePrice?.trim());

  return {
    ...course,
    price: hasSale ? course.price : STANDARD_GLOBAL_PRICES.price,
    oldPrice: hasList ? course.oldPrice : STANDARD_GLOBAL_PRICES.oldPrice,
    basePrice: hasBase ? course.basePrice : STANDARD_GLOBAL_PRICES.basePrice,
    regionalPrices,
  };
}

export function standardRegionalRowForCountry(
  countryCode: string,
): CourseRegionalPriceRow | undefined {
  const code = countryCode.trim().toUpperCase();
  return STANDARD_REGIONAL_PRICES.find((r) => r.countryCode === code);
}
