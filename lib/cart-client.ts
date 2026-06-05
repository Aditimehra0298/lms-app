/** Client cart helpers (`localStorage` key `sft_cart`). */

export const CART_STORAGE_KEY = "sft_cart";

export type CartLineItem = {
  slug: string;
  title: string;
  price: string;
  image?: string;
  qty: number;
  deliveryKind?: "managed" | "tutor-led";
};

export function readCartItems(): CartLineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLineItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i?.slug?.trim()) : [];
  } catch {
    return [];
  }
}

export function parseCartPrice(value: string): number {
  const amount = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function cartTotals(items: CartLineItem[]) {
  const subtotal = items.reduce((sum, item) => sum + parseCartPrice(item.price) * item.qty, 0);
  const discount = items.length >= 2 ? subtotal * 0.1 : 0;
  const total = subtotal - discount;
  return { subtotal, discount, total, itemCount: items.length };
}

export function cartFingerprint(items: CartLineItem[]): string {
  return items
    .map((i) => `${i.slug}:${i.qty}`)
    .sort()
    .join("|");
}
