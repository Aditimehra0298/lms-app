import type { LearnerAuthProfile } from "@/lib/auth-profile";
import {
  cacheLearnerProfile,
  clearLearnerProfileStorage,
  learnerProfileFromDb,
} from "@/lib/auth-profile";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import { pricingRegionForCountry, type PricingRegion } from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";

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

export const PRICING_REGION_EVENT = "sft_pricing_region_updated";

export function cachePricingRegion(region: PricingRegion, options?: { notify?: boolean }): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEYS.countryCode, region.countryCode);
  window.localStorage.setItem(AUTH_KEYS.countryName, region.countryName);
  window.localStorage.setItem(AUTH_KEYS.pricingRegion, JSON.stringify(region));
  if (options?.notify !== false) {
    window.dispatchEvent(new Event(PRICING_REGION_EVENT));
  }
}

/** Cache regional pricing from ISO country (registration phone dial code, etc.). */
export function cachePricingRegionFromCountryCode(countryCode: string): PricingRegion | null {
  const code = countryCode.trim().toUpperCase();
  if (!code) return null;
  const region = pricingRegionForCountry(code, countryDisplayName(code));
  cachePricingRegion(region);
  return region;
}

/** Guest / pre-login: detect country from IP via server, then cache pricing region. */
export async function fetchGuestPricingRegion(): Promise<PricingRegion | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/geo/country", { cache: "no-store" });
    if (!res.ok) return getCachedPricingRegion();
    const data = (await res.json()) as { region?: PricingRegion; countryCode?: string };
    if (data.region) {
      cachePricingRegion(data.region);
      return data.region;
    }
    if (data.countryCode) {
      return cachePricingRegionFromCountryCode(data.countryCode);
    }
  } catch {
    /* ignore */
  }
  return getCachedPricingRegion();
}

export type AuthRecordResult = {
  ok: boolean;
  message?: string;
  region?: PricingRegion;
  ipv4?: string | null;
  ipv6?: string | null;
  dbSaved?: boolean;
  dbError?: string;
  profile?: LmsUserProfilePayload;
  countrySource?: string;
};

export function applyDbProfileToSession(profile: LmsUserProfilePayload): LearnerAuthProfile {
  const learner = learnerProfileFromDb(profile);
  window.localStorage.setItem(AUTH_KEYS.email, profile.email);
  window.localStorage.setItem(AUTH_KEYS.role, profile.role === "admin" ? "admin" : "learner");
  cacheLearnerProfile(learner);
  if (profile.countryCode && profile.countryName) {
    cachePricingRegion(
      pricingRegionForCountry(profile.countryCode, profile.countryName),
    );
  }
  window.dispatchEvent(new Event("sft_auth_updated"));
  return learner;
}

/** Load profile from MySQL and refresh header / local session. */
export async function syncLearnerProfileFromServer(email: string): Promise<LearnerAuthProfile | null> {
  if (typeof window === "undefined" || !email.trim()) return null;
  try {
    const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; profile?: LmsUserProfilePayload };
    if (!res.ok || !data.ok || !data.profile) return null;
    return applyDbProfileToSession(data.profile);
  } catch {
    return null;
  }
}

export { clearLearnerProfileStorage };

export type AuthCountryInput = {
  countryCode?: string;
  countryName?: string;
};

/** Call after login/register to store IP, country, pricing region, and profile in MySQL. */
export async function recordLearnerAuth(
  email: string,
  action: "login" | "register",
  profile?: LearnerAuthProfile,
  country?: AuthCountryInput,
  password?: string,
): Promise<AuthRecordResult> {
  const res = await fetch("/api/auth/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      action,
      password: action === "register" ? password : undefined,
      name: profile?.name,
      accountType: profile?.accountType,
      avatarUrl: profile?.avatarUrl,
      phone: profile?.phone,
      companyName: profile?.companyName,
      personalEmail: profile?.personalEmail,
      industryType: profile?.industryType,
      companySize: profile?.companySize,
      countryCode: country?.countryCode,
      countryName: country?.countryName,
    }),
  });
  const data = (await res.json()) as AuthRecordResult;
  if (!res.ok) {
    data.ok = false;
  }
  if (data.ok && data.region) {
    cachePricingRegion(data.region);
  }
  if (data.ok && data.profile) {
    applyDbProfileToSession(data.profile);
  } else if (data.ok && profile) {
    cacheLearnerProfile(profile);
    window.dispatchEvent(new Event("sft_auth_updated"));
  } else if (data.ok && data.region) {
    window.dispatchEvent(new Event("sft_auth_updated"));
  }
  return data;
}

export async function refreshPricingRegion(): Promise<PricingRegion | null> {
  const email = getLearnerEmail();
  if (!email || !isLearnerLoggedIn()) return getCachedPricingRegion();

  try {
    const res = await fetch(`/api/pricing/region?email=${encodeURIComponent(email)}`, {
      cache: "no-store",
    });
    if (!res.ok) return getCachedPricingRegion();
    const data = (await res.json()) as { region?: PricingRegion };
    if (data.region) {
      cachePricingRegion(data.region, { notify: false });
      return data.region;
    }
  } catch {
    /* network / dev server unavailable — use cached region */
  }
  return getCachedPricingRegion();
}
