export type RazorpayCurrency = "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD";

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || null;
}

export function getRazorpayKeySecret(): string | null {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || null;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function getRazorpayCurrency(): RazorpayCurrency {
  const raw = (process.env.RAZORPAY_CURRENCY ?? process.env.NEXT_PUBLIC_RAZORPAY_CURRENCY ?? "INR")
    .trim()
    .toUpperCase();
  if (raw === "USD" || raw === "EUR" || raw === "GBP" || raw === "AED" || raw === "SGD") return raw;
  return "INR";
}

export function getPublicRazorpayConfig() {
  return {
    configured: isRazorpayConfigured(),
    keyId: getRazorpayKeyId(),
    /** Checkout currency follows each learner's pricing region — not a single global currency. */
    multiCurrency: true,
  };
}
