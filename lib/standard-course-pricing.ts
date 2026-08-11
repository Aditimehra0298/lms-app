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
