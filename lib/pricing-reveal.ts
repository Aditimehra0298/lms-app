export const PRICING_REVEALED_KEY = "sft_pricing_revealed";

export function isPricingRevealed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRICING_REVEALED_KEY) === "true";
}

export function setPricingRevealed(revealed: boolean): void {
  if (typeof window === "undefined") return;
  if (revealed) {
    window.localStorage.setItem(PRICING_REVEALED_KEY, "true");
  } else {
    window.localStorage.removeItem(PRICING_REVEALED_KEY);
  }
  window.dispatchEvent(new Event("sft_pricing_reveal_updated"));
}
