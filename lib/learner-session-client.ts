import type { PricingRegion } from "@/lib/country-pricing";

export const AUTH_KEYS = {
  loggedIn: "sft_logged_in",
  email: "sft_learner_email",
  role: "sft_user_role",
  countryCode: "sft_country_code",
  countryName: "sft_country_name",
  pricingRegion: "sft_pricing_region",
} as const;

export function isLearnerLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEYS.loggedIn) === "true";
}

export function getLearnerEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEYS.email);
}

export function loginRedirectHref(redirectPath?: string): string {
  const redirect =
    redirectPath ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/account?mode=login&redirect=${encodeURIComponent(redirect)}`;
}

export function registerRedirectHref(redirectPath?: string): string {
  const redirect =
    redirectPath ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/account?mode=register&redirect=${encodeURIComponent(redirect)}`;
}

export function getCachedPricingRegion(): PricingRegion | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEYS.pricingRegion);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PricingRegion;
  } catch {
    return null;
  }
}

export function cachePricingRegion(region: PricingRegion): void {
  window.localStorage.setItem(AUTH_KEYS.countryCode, region.countryCode);
  window.localStorage.setItem(AUTH_KEYS.countryName, region.countryName);
  window.localStorage.setItem(AUTH_KEYS.pricingRegion, JSON.stringify(region));
}

export type AuthRecordResult = {
  ok: boolean;
  region?: PricingRegion;
  ipv4?: string | null;
  ipv6?: string | null;
  dbSaved?: boolean;
};

/** Call after login/register to store IP, country, and pricing region. */
export async function recordLearnerAuth(
  email: string,
  action: "login" | "register",
  name?: string,
): Promise<AuthRecordResult> {
  const res = await fetch("/api/auth/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), name, action }),
  });
  const data = (await res.json()) as AuthRecordResult;
  if (data.ok && data.region) {
    cachePricingRegion(data.region);
  }
  return data;
}

export async function refreshPricingRegion(): Promise<PricingRegion | null> {
  const email = getLearnerEmail();
  if (!email || !isLearnerLoggedIn()) return null;
  const res = await fetch(`/api/pricing/region?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  });
  if (!res.ok) return getCachedPricingRegion();
  const data = (await res.json()) as { region?: PricingRegion };
  if (data.region) {
    cachePricingRegion(data.region);
    return data.region;
  }
  return getCachedPricingRegion();
}
