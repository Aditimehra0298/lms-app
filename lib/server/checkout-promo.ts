import { parseStoredPriceString } from "@/lib/country-pricing";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  computePromotionDiscount,
  defaultPromotions,
  sanitizePromotions,
} from "@/lib/promotions";
import { readAdminContentFromDisk, writeAdminContent } from "@/lib/server/content-store";

export async function resolveCheckoutPromoDiscount(input: {
  code?: string;
  slugs: string[];
  subtotal: number;
  currency: string;
  catalog: ManagedCourse[];
}): Promise<{ extraDiscount: number; code: string; label: string } | { extraDiscount: 0; code: ""; label: "" }> {
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code) return { extraDiscount: 0, code: "", label: "" };

  const content = await readAdminContentFromDisk();
  const promotions = content.promotions
    ? sanitizePromotions(content.promotions)
    : defaultPromotions;

  let baseFloor = 0;
  for (const slug of input.slugs) {
    const course = input.catalog.find((c) => c.slug === slug) ??
      (content.managedCourses ?? []).find((c) => c.slug === slug);
    if (!course) continue;
    const regional = course.regionalPrices?.find(
      (r) => r.countryCode.toUpperCase() === (input.currency === "INR" ? "IN" : ""),
    );
    const n = parseStoredPriceString(regional?.basePrice || course.basePrice || "");
    if (n != null) baseFloor += n;
  }

  const result = computePromotionDiscount({
    promotions,
    code,
    slugs: input.slugs,
    subtotal: input.subtotal,
    checkoutCurrency: input.currency.toUpperCase(),
    baseFloor: baseFloor > 0 ? baseFloor : undefined,
  });
  if (!result.ok) return { extraDiscount: 0, code: "", label: "" };
  return { extraDiscount: result.discount, code, label: result.label };
}

export async function consumePromotionCode(code: string): Promise<void> {
  const upper = code.trim().toUpperCase();
  if (!upper) return;
  const content = await readAdminContentFromDisk();
  const promotions = sanitizePromotions(content.promotions ?? defaultPromotions);
  let changed = false;
  const coupons = promotions.coupons.map((c) => {
    if (c.code !== upper) return c;
    changed = true;
    return { ...c, uses: c.uses + 1 };
  });
  const referrals = promotions.referrals.map((r) => {
    if (r.code !== upper) return r;
    changed = true;
    return { ...r, uses: r.uses + 1 };
  });
  if (!changed) return;
  await writeAdminContent({ ...content, promotions: { coupons, referrals } });
}

export function promoNote(code: string): string | null {
  const c = code.trim().toUpperCase();
  return c ? `promo:${c}` : null;
}

export function promoCodeFromNote(note: string | null | undefined): string {
  const m = /^promo:([A-Z0-9_-]+)$/i.exec(note?.trim() ?? "");
  return m?.[1]?.toUpperCase() ?? "";
}
