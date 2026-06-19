/** Parse a display price string (₹1,499 / $49.00) into a numeric amount. */
export function parsePriceLabel(value: string): number {
  return Number(String(value).replace(/[^0-9.]/g, "")) || 0;
}

export type CheckoutLineItem = { price: string; qty: number };

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
};

/** Same math as checkout page — multi-item 10% discount + 18% GST on (subtotal − discount). */
export function computeCheckoutTotals(items: CheckoutLineItem[]): CheckoutTotals {
  const subtotal = items.reduce((sum, item) => sum + parsePriceLabel(item.price) * item.qty, 0);
  const discount = items.length >= 2 ? subtotal * 0.1 : 0;
  const gst = (subtotal - discount) * 0.18;
  const total = subtotal - discount + gst;
  return { subtotal, discount, gst, total };
}

/** Razorpay expects amount in the smallest currency unit (paise, cents, etc.). */
export function toSmallestCurrencyUnit(amount: number, currency: string): number {
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP", "PYG", "UGX", "VUV"]);
  if (zeroDecimal.has(currency.toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100);
}
