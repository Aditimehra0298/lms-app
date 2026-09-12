import { sanitizeRegionalPrices } from "@/lib/course-regional-pricing";
import type { ManagedCourse } from "@/lib/content-schema";
import { currencyCodeFromPriceString, parseStoredPriceString } from "@/lib/country-pricing";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { sanitizeOrganizationSeatPricing } from "@/lib/organization-course-pricing";

function formatInrAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function inrFromLabel(label: string | undefined): number | null {
  if (!label?.trim()) return null;
  const code = currencyCodeFromPriceString(label);
  if (code && code !== "INR") return null;
  const n = parseStoredPriceString(label);
  return n == null ? null : Math.round(n);
}

/** Shape the existing self-paced Pricing editors expect. */
export function tutorLedPricingCourse(program: TutorLedProgramStored): ManagedCourse {
  return {
    slug: program.slug,
    title: program.title,
    subtitle: program.subtitle,
    category: program.category ?? "live",
    level: "",
    duration: "",
    rating: "",
    learners: "",
    price: program.priceLabel?.trim() || formatInrAmount(program.price) || "₹0",
    oldPrice: program.oldPriceLabel?.trim() || formatInrAmount(program.originalPrice) || "",
    basePrice: program.basePrice ?? "",
    regionalPrices: program.regionalPrices ?? [],
    organizationSeatPricing: program.organizationSeatPricing ?? [],
    image: program.heroSrc ?? "",
    published: program.published,
    learningFormat: "live",
  };
}

export function applyTutorLedPricingDraft(
  program: TutorLedProgramStored,
  pricing: ManagedCourse,
): TutorLedProgramStored {
  const regionalPrices = sanitizeRegionalPrices(pricing.regionalPrices);
  const organizationSeatPricing = sanitizeOrganizationSeatPricing(pricing.organizationSeatPricing);
  const india = regionalPrices.find((row) => row.countryCode === "IN");
  const saleInr = inrFromLabel(india?.price) ?? inrFromLabel(pricing.price) ?? program.price;
  const listInr = inrFromLabel(india?.oldPrice) ?? inrFromLabel(pricing.oldPrice) ?? program.originalPrice;
  const discount =
    listInr > saleInr && saleInr > 0
      ? `${Math.round((1 - saleInr / listInr) * 100)}% OFF`
      : program.discount;

  return {
    ...program,
    price: saleInr,
    originalPrice: listInr,
    priceLabel: pricing.price,
    oldPriceLabel: pricing.oldPrice,
    basePrice: pricing.basePrice,
    regionalPrices,
    organizationSeatPricing,
    discount,
  };
}
