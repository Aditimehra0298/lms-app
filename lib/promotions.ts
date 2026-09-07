import type {
  AdminCoupon,
  AdminReferralCode,
  PromotionsConfig,
} from "@/lib/content-schema";

export const defaultPromotions: PromotionsConfig = {
  coupons: [
    {
      id: "coupon-welcome10",
      code: "WELCOME10",
      discountKind: "percent",
      amount: 10,
      courseScope: "all",
      uses: 120,
      maxUses: 500,
      validFrom: "2026-08-01",
      validTo: "2026-08-31",
      status: "active",
    },
    {
      id: "coupon-sf20",
      code: "SF20",
      discountKind: "percent",
      amount: 20,
      courseScope: "course",
      courseSlug: "",
      uses: 45,
      maxUses: 200,
      validFrom: "2026-08-10",
      validTo: "2026-10-10",
      status: "active",
    },
    {
      id: "coupon-fs50",
      code: "FS50",
      discountKind: "fixed",
      amount: 50,
      currency: "INR",
      courseScope: "all",
      uses: 80,
      maxUses: 300,
      validFrom: "2026-08-01",
      validTo: "2026-09-15",
      status: "active",
    },
  ],
  referrals: [
    {
      id: "ref-parth10",
      code: "PARTH10",
      customerDiscountKind: "percent",
      customerDiscountAmount: 10,
      rewardKind: "percent",
      rewardAmount: 5,
      uses: 32,
      status: "active",
    },
    {
      id: "ref-sfref20",
      code: "SFREF20",
      customerDiscountKind: "percent",
      customerDiscountAmount: 20,
      rewardKind: "fixed",
      rewardAmount: 200,
      rewardCurrency: "INR",
      uses: 18,
      status: "active",
    },
    {
      id: "ref-affiliate15",
      code: "AFFILIATE15",
      customerDiscountKind: "percent",
      customerDiscountAmount: 15,
      rewardKind: "percent",
      rewardAmount: 7,
      uses: 10,
      status: "active",
    },
  ],
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyCoupon(courseSlug?: string): AdminCoupon {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newId("coupon"),
    code: "",
    discountKind: "percent",
    amount: 10,
    courseScope: courseSlug ? "course" : "all",
    courseSlug: courseSlug ?? "",
    uses: 0,
    maxUses: 100,
    validFrom: today,
    validTo: today,
    status: "active",
  };
}

export function emptyReferral(): AdminReferralCode {
  return {
    id: newId("ref"),
    code: "",
    customerDiscountKind: "percent",
    customerDiscountAmount: 10,
    rewardKind: "percent",
    rewardAmount: 5,
    uses: 0,
    status: "active",
  };
}

function isoDate(value: unknown, fallback: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

export function sanitizePromotions(raw: unknown): PromotionsConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Partial<PromotionsConfig>;
  const coupons = Array.isArray(src.coupons) ? src.coupons : [];
  const referrals = Array.isArray(src.referrals) ? src.referrals : [];
  return {
    coupons: coupons
      .map((c, i) => {
        const code = String(c?.code ?? "").trim().toUpperCase();
        if (!code) return null;
        const kind = c.discountKind === "fixed" ? "fixed" : "percent";
        const amount = Number(c.amount);
        return {
          id: String(c.id ?? "").trim() || `coupon-${i + 1}`,
          code,
          discountKind: kind as AdminCoupon["discountKind"],
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
          currency: String(c.currency ?? "").trim().toUpperCase() || (kind === "fixed" ? "INR" : undefined),
          courseScope: c.courseScope === "course" ? "course" : "all",
          courseSlug: String(c.courseSlug ?? "").trim(),
          uses: Math.max(0, Math.floor(Number(c.uses) || 0)),
          maxUses: Math.max(1, Math.floor(Number(c.maxUses) || 100)),
          validFrom: isoDate(c.validFrom, "2026-01-01"),
          validTo: isoDate(c.validTo, "2026-12-31"),
          status: c.status === "disabled" ? "disabled" : "active",
          allowBelowBase: Boolean(c.allowBelowBase),
        } satisfies AdminCoupon;
      })
      .filter((c): c is AdminCoupon => Boolean(c)),
    referrals: referrals
      .map((r, i) => {
        const code = String(r?.code ?? "").trim().toUpperCase();
        if (!code) return null;
        const custAmt = Number(r.customerDiscountAmount);
        const rewardAmt = Number(r.rewardAmount);
        return {
          id: String(r.id ?? "").trim() || `ref-${i + 1}`,
          code,
          customerDiscountKind: r.customerDiscountKind === "fixed" ? "fixed" : "percent",
          customerDiscountAmount: Number.isFinite(custAmt) && custAmt > 0 ? custAmt : 0,
          customerDiscountCurrency: String(r.customerDiscountCurrency ?? "").trim().toUpperCase() || undefined,
          rewardKind: r.rewardKind === "fixed" ? "fixed" : "percent",
          rewardAmount: Number.isFinite(rewardAmt) && rewardAmt >= 0 ? rewardAmt : 0,
          rewardCurrency: String(r.rewardCurrency ?? "").trim().toUpperCase() || undefined,
          uses: Math.max(0, Math.floor(Number(r.uses) || 0)),
          status: r.status === "disabled" ? "disabled" : "active",
        } satisfies AdminReferralCode;
      })
      .filter((r): r is AdminReferralCode => Boolean(r)),
  };
}

export function formatValidityRange(from: string, to: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const a = fmt(from);
  const b = fmt(to);
  const year = from.slice(0, 4);
  if (from.slice(0, 4) === to.slice(0, 4)) {
    const aNoYear = a.replace(`, ${year}`, "").replace(` ${year}`, "");
    return `${aNoYear} – ${b}`;
  }
  return `${a} – ${b}`;
}

export function formatCouponDiscount(c: AdminCoupon): string {
  if (c.discountKind === "percent") return `${c.amount}% OFF`;
  if (c.currency === "INR") return `₹${c.amount} OFF`;
  return `${c.currency ?? ""} ${c.amount} OFF`.trim();
}

export function formatReferralCustomerDiscount(r: AdminReferralCode): string {
  if (r.customerDiscountKind === "percent") return `${r.customerDiscountAmount}% OFF`;
  if (r.customerDiscountCurrency === "INR") return `₹${r.customerDiscountAmount} OFF`;
  return `${r.customerDiscountCurrency ?? ""} ${r.customerDiscountAmount} OFF`.trim();
}

export function formatReferralReward(r: AdminReferralCode): string {
  if (r.rewardKind === "percent") return `${r.rewardAmount}% Commission`;
  if (r.rewardCurrency === "INR") return `₹${r.rewardAmount} / Order`;
  return `${r.rewardCurrency ?? ""} ${r.rewardAmount} / Order`.trim();
}

export function couponIsExpired(c: AdminCoupon, now = new Date()): boolean {
  const t = now.toISOString().slice(0, 10);
  return t < c.validFrom || t > c.validTo;
}

export function couponStatusLabel(c: AdminCoupon): "Active" | "Expired" | "Disabled" {
  if (c.status === "disabled") return "Disabled";
  if (couponIsExpired(c)) return "Expired";
  return "Active";
}

function discountAmount(
  kind: "percent" | "fixed",
  amount: number,
  subtotal: number,
  currency?: string,
  checkoutCurrency?: string,
): number {
  if (kind === "percent") return Math.max(0, subtotal * (amount / 100));
  if (currency && checkoutCurrency && currency !== checkoutCurrency) return 0;
  return Math.max(0, amount);
}

export function computePromotionDiscount(input: {
  promotions: PromotionsConfig;
  code: string;
  slugs: string[];
  subtotal: number;
  checkoutCurrency: string;
  baseFloor?: number;
}): { ok: true; discount: number; label: string; kind: "coupon" | "referral" } | { ok: false; error: string } {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  /** Uniform message — do not distinguish missing vs inactive (enumeration oracle). */
  const invalidCode = "Invalid or inactive code.";

  const coupon = input.promotions.coupons.find((c) => c.code === code);
  if (coupon) {
    if (coupon.status !== "active" || couponIsExpired(coupon)) {
      return { ok: false, error: invalidCode };
    }
    if (coupon.uses >= coupon.maxUses) return { ok: false, error: "This coupon has reached its use limit." };
    if (coupon.courseScope === "course") {
      const slug = coupon.courseSlug?.trim();
      if (slug && !input.slugs.includes(slug)) {
        return { ok: false, error: "This coupon is not valid for the courses in your cart." };
      }
    }
    let discount = discountAmount(
      coupon.discountKind,
      coupon.amount,
      input.subtotal,
      coupon.currency,
      input.checkoutCurrency,
    );
    if (coupon.discountKind === "fixed" && discount <= 0) {
      return { ok: false, error: `This coupon applies in ${coupon.currency ?? "its"} currency only.` };
    }
    if (!coupon.allowBelowBase && input.baseFloor != null) {
      const maxOff = Math.max(0, input.subtotal - input.baseFloor);
      discount = Math.min(discount, maxOff);
    }
    discount = Math.min(discount, input.subtotal);
    return { ok: true, discount, label: formatCouponDiscount(coupon), kind: "coupon" };
  }

  const referral = input.promotions.referrals.find((r) => r.code === code);
  if (referral) {
    if (referral.status !== "active") return { ok: false, error: invalidCode };
    let discount = discountAmount(
      referral.customerDiscountKind,
      referral.customerDiscountAmount,
      input.subtotal,
      referral.customerDiscountCurrency,
      input.checkoutCurrency,
    );
    if (referral.customerDiscountKind === "fixed" && discount <= 0) {
      return { ok: false, error: "This referral code does not apply in your currency." };
    }
    if (input.baseFloor != null) {
      discount = Math.min(discount, Math.max(0, input.subtotal - input.baseFloor));
    }
    discount = Math.min(discount, input.subtotal);
    return {
      ok: true,
      discount,
      label: formatReferralCustomerDiscount(referral),
      kind: "referral",
    };
  }

  return { ok: false, error: invalidCode };
}
