import type {
  ManagedCourse,
  OrganizationSeatBandId,
  OrganizationSeatBandPriceRow,
} from "@/lib/content-schema";
import {
  computeDiscountPercent,
  displayRegionForResolvedPrice,
  resolveCoursePrices,
} from "@/lib/course-regional-pricing";
import { parseStoredPriceString, type PricingRegion } from "@/lib/country-pricing";

export type OrganizationSeatBand = {
  id: OrganizationSeatBandId;
  label: string;
  minSeats: number;
  maxSeats: number;
  /** Used when admin has not set an org row — scales individual regional price. */
  avgSeats: number;
  teamDiscount: number;
};

export const ORGANIZATION_SEAT_BANDS: OrganizationSeatBand[] = [
  { id: "1-10", label: "1 – 10 employees", minSeats: 1, maxSeats: 10, avgSeats: 6, teamDiscount: 0.88 },
  { id: "11-20", label: "11 – 20 employees", minSeats: 11, maxSeats: 20, avgSeats: 15, teamDiscount: 0.85 },
  { id: "21-30", label: "21 – 30 employees", minSeats: 21, maxSeats: 30, avgSeats: 25, teamDiscount: 0.82 },
  { id: "31-40", label: "31 – 40 employees", minSeats: 31, maxSeats: 40, avgSeats: 35, teamDiscount: 0.8 },
  { id: "41-50", label: "41 – 50 employees", minSeats: 41, maxSeats: 50, avgSeats: 45, teamDiscount: 0.78 },
  { id: "51+", label: "51+ employees", minSeats: 51, maxSeats: 999, avgSeats: 60, teamDiscount: 0.75 },
];

export type ResolvedOrganizationCoursePrice = {
  ready: boolean;
  price: string;
  oldPrice: string;
  discountPercent: number | null;
  isAdminConfigured: boolean;
  bandId: OrganizationSeatBandId | null;
  bandLabel: string | null;
  seatCount: number | null;
  countryCode: string | null;
  message?: string;
};

/** Map entered seat count to backend pricing band. */
export function resolveSeatBandFromCount(seatCount: number): OrganizationSeatBand | null {
  const n = Math.floor(seatCount);
  if (!Number.isFinite(n) || n < 1) return null;
  return (
    ORGANIZATION_SEAT_BANDS.find((b) => n >= b.minSeats && n <= b.maxSeats) ?? null
  );
}

export function resolveOrganizationCoursePriceBySeatCount(
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices" | "organizationSeatPricing">,
  region: PricingRegion | null,
  seatCount: number | null,
): ResolvedOrganizationCoursePrice {
  if (!seatCount || seatCount < 1) {
    return {
      ready: false,
      price: "",
      oldPrice: "",
      discountPercent: null,
      isAdminConfigured: false,
      bandId: null,
      bandLabel: null,
      seatCount: null,
      countryCode: region?.countryCode ?? null,
      message: "Enter how many seats you need.",
    };
  }
  const band = resolveSeatBandFromCount(seatCount);
  if (!band) {
    return {
      ready: false,
      price: "",
      oldPrice: "",
      discountPercent: null,
      isAdminConfigured: false,
      bandId: null,
      bandLabel: null,
      seatCount,
      countryCode: region?.countryCode ?? null,
      message: "Seat count is outside supported ranges.",
    };
  }
  const resolved = resolveOrganizationCoursePrice(course, region, band.id);
  return {
    ...resolved,
    bandLabel: band.label,
    seatCount,
  };
}

function findOrgSeatRow(
  rows: OrganizationSeatBandPriceRow[] | undefined,
  countryCode: string,
  bandId: OrganizationSeatBandId,
): OrganizationSeatBandPriceRow | undefined {
  const code = countryCode.trim().toUpperCase();
  return rows?.find(
    (r) => r.countryCode.trim().toUpperCase() === code && r.bandId === bandId,
  );
}

function formatScaledPrice(amount: number, templatePrice: string, region: PricingRegion | null): string {
  const parsed = parseStoredPriceString(templatePrice);
  if (parsed === null) return templatePrice;
  const sym = templatePrice.replace(/[\d.,\s]/g, "").trim() || region?.currencySymbol || "₹";
  const scaled = Math.round(amount);
  try {
    if (region) {
      return new Intl.NumberFormat(region.locale, {
        style: "currency",
        currency: region.currency,
        maximumFractionDigits: 0,
      }).format(scaled);
    }
  } catch {
    /* fall through */
  }
  return `${sym}${scaled.toLocaleString("en-IN")}`;
}

/** Organisation price = admin row (region + band) OR scaled individual regional price. */
export function resolveOrganizationCoursePrice(
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices" | "organizationSeatPricing">,
  region: PricingRegion | null,
  bandId: OrganizationSeatBandId | null,
): ResolvedOrganizationCoursePrice {
  if (!region || !bandId) {
    return {
      ready: false,
      price: "",
      oldPrice: "",
      discountPercent: null,
      isAdminConfigured: false,
      bandId,
      bandLabel: null,
      seatCount: null,
      countryCode: region?.countryCode ?? null,
      message: "Enter seat count to see organisation pricing.",
    };
  }

  const band = ORGANIZATION_SEAT_BANDS.find((b) => b.id === bandId);
  if (!band) {
    return {
      ready: false,
      price: "",
      oldPrice: "",
      discountPercent: null,
      isAdminConfigured: false,
      bandId,
      bandLabel: null,
      seatCount: null,
      countryCode: region.countryCode,
      message: "Invalid team size band.",
    };
  }

  const configured = findOrgSeatRow(course.organizationSeatPricing, region.countryCode, bandId);
  if (configured?.price?.trim()) {
    const price = configured.price.trim();
    const oldPrice = configured.oldPrice?.trim() ?? "";
    return {
      ready: true,
      price,
      oldPrice,
      discountPercent: computeDiscountPercent(price, oldPrice),
      isAdminConfigured: true,
      bandId,
      bandLabel: band.label,
      seatCount: null,
      countryCode: region.countryCode,
    };
  }

  const individual = resolveCoursePrices(course, region);
  const payRegion = displayRegionForResolvedPrice(individual, region);
  const base = parseStoredPriceString(individual.price);
  if (base === null) {
    return {
      ready: false,
      price: "",
      oldPrice: "",
      discountPercent: null,
      isAdminConfigured: false,
      bandId,
      bandLabel: band.label,
      seatCount: null,
      countryCode: region.countryCode,
      message: "Organisation price not configured for this course yet.",
    };
  }

  const teamTotal = base * band.avgSeats * band.teamDiscount;
  const listBase = parseStoredPriceString(individual.oldPrice) ?? base;
  const teamList = listBase * band.avgSeats;

  const price = formatScaledPrice(teamTotal, individual.price, payRegion);
  const oldPrice =
    individual.oldPrice?.trim() ? formatScaledPrice(teamList, individual.oldPrice, payRegion) : "";

  return {
    ready: true,
    price,
    oldPrice,
    discountPercent: computeDiscountPercent(price, oldPrice),
    isAdminConfigured: false,
    bandId,
    bandLabel: band.label,
    seatCount: null,
    countryCode: region.countryCode,
  };
}

export function sanitizeOrganizationSeatPricing(
  rows: OrganizationSeatBandPriceRow[] | undefined,
): OrganizationSeatBandPriceRow[] {
  if (!Array.isArray(rows)) return [];
  const out: OrganizationSeatBandPriceRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const countryCode = row.countryCode?.trim().toUpperCase();
    const bandId = row.bandId;
    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode) || !bandId) continue;
    const key = `${countryCode}:${bandId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!row.price?.trim()) continue;
    out.push({
      countryCode,
      bandId,
      price: row.price.trim(),
      oldPrice: row.oldPrice?.trim() || undefined,
    });
  }
  return out;
}
