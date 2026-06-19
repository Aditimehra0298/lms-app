import { prisma } from "@/lib/prisma";
import { pricingRegionFromCountryCode } from "@/lib/checkout-regional-pricing";
import type { PricingRegion } from "@/lib/country-pricing";

/** ISO 4217 codes Razorpay commonly accepts (international + India). */
const RAZORPAY_SUPPORTED = new Set([
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "SGD",
  "AUD",
  "CAD",
  "MYR",
  "THB",
  "HKD",
  "JPY",
  "KWD",
  "BHD",
  "OMR",
  "QAR",
  "CHF",
  "SEK",
  "DKK",
  "NOK",
  "NZD",
  "ZAR",
  "PKR",
  "BDT",
  "LKR",
  "NPR",
  "PHP",
  "IDR",
  "KRW",
  "VND",
  "CNY",
  "TRY",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "ILS",
  "MXN",
  "BRL",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "EGP",
  "KES",
  "NGN",
  "RUB",
  "UAH",
  "TWD",
]);

export function normalizePaymentCurrency(currency: string, fallback = "INR"): string {
  const code = currency.trim().toUpperCase();
  if (RAZORPAY_SUPPORTED.has(code)) return code;
  const envDefault = process.env.RAZORPAY_CURRENCY?.trim().toUpperCase();
  if (envDefault && RAZORPAY_SUPPORTED.has(envDefault)) return envDefault;
  return fallback;
}

export function isPaymentCurrencySupported(currency: string): boolean {
  return RAZORPAY_SUPPORTED.has(currency.trim().toUpperCase());
}

export async function resolveLearnerPricingRegion(input: {
  learnerEmail: string;
  countryCode?: string;
}): Promise<PricingRegion> {
  const hint = input.countryCode?.trim().toUpperCase();
  if (hint) {
    return pricingRegionFromCountryCode(hint);
  }

  try {
    const user = await prisma.lmsUser.findUnique({
      where: { email: input.learnerEmail.trim().toLowerCase() },
      select: { countryCode: true, countryName: true },
    });
    if (user?.countryCode) {
      return pricingRegionFromCountryCode(user.countryCode, user.countryName ?? undefined);
    }
  } catch {
    /* fall through */
  }

  return pricingRegionFromCountryCode("IN", "India");
}

export function minimumPaymentAmountSmallestUnit(currency: string): number {
  const code = currency.toUpperCase();
  if (code === "INR") return 100;
  if (code === "USD" || code === "EUR" || code === "GBP") return 50;
  return 1;
}
