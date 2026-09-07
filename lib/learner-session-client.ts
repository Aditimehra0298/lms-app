import type { LearnerAuthProfile } from "@/lib/auth-profile";
import {
  cacheLearnerProfile,
  clearLearnerProfileStorage,
  learnerProfileFromDb,
} from "@/lib/auth-profile";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import { pricingRegionForCountry, type PricingRegion } from "@/lib/country-pricing";
import { countryDisplayName } from "@/lib/iso-country-list";
import { setPricingRevealed } from "@/lib/pricing-reveal";
import { syncEnrollmentsToServer } from "@/lib/enrollment-sync-client";
import { readJsonResponse, safeJsonParse } from "@/lib/safe-json";

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

const LEARNER_AUTH_EVENTS = ["sft_auth_updated", "storage"] as const;

/** Subscribe to login/session changes (for useSyncExternalStore). */
export function subscribeLearnerAuth(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  for (const event of LEARNER_AUTH_EVENTS) {
    window.addEventListener(event, handler);
  }
  return () => {
    for (const event of LEARNER_AUTH_EVENTS) {
      window.removeEventListener(event, handler);
    }
  };
}

export function getLearnerEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEYS.email);
}

/**
 * Never store email/name/phone in cookies.
 * Identity for APIs comes from httpOnly session only (`/api/auth/me`, learner session).
 * This only wipes legacy PII cookies (e.g. old sft_learner_email).
 */
export function clearLearnerPiiCookies(): void {
  if (typeof window === "undefined") return;
  const names = [AUTH_KEYS.email, AUTH_KEYS.role, "sft_user_role", "sft_learner_name", "sft_learner_phone"];
  const host = window.location.hostname.toLowerCase();
  const base = host.startsWith("www.") ? host.slice(4) : host;
  const domains = ["", `Domain=${host}`, ...(base.includes(".") ? [`Domain=.${base}`] : [])];
  for (const name of names) {
    for (const domainPart of domains) {
      const parts = [`${name}=`, "Path=/", "Max-Age=0", "SameSite=Lax"];
      if (domainPart) parts.push(domainPart);
      document.cookie = parts.join("; ");
    }
  }
}

/** @deprecated Use clearLearnerPiiCookies — email must not live in cookies. */
export function syncLearnerEmailCookie(): void {
  clearLearnerPiiCookies();
}

/** Pass `redirectPath` from `usePathname()` in render to avoid hydration mismatch. */
export function loginRedirectHref(redirectPath: string = "/"): string {
  return `/account?mode=login&redirect=${encodeURIComponent(redirectPath)}`;
}

export function registerRedirectHref(redirectPath: string = "/"): string {
  return `/account?mode=register&redirect=${encodeURIComponent(redirectPath)}`;
}

/** Use in click handlers only (client has window). */
export function loginRedirectHrefForCurrentPage(): string {
  if (typeof window === "undefined") return loginRedirectHref("/");
  return loginRedirectHref(window.location.pathname + window.location.search);
}

export function getCachedPricingRegion(): PricingRegion | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEYS.pricingRegion);
  return safeJsonParse<PricingRegion | null>(raw, null);
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
    const data = await readJsonResponse(res, {} as { region?: PricingRegion; countryCode?: string });
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
  const prevEmail = window.localStorage.getItem(AUTH_KEYS.email);
  const nextRole = profile.role === "admin" ? "admin" : "learner";
  const prevRole = window.localStorage.getItem(AUTH_KEYS.role);
  window.localStorage.setItem(AUTH_KEYS.email, profile.email);
  window.localStorage.setItem(AUTH_KEYS.role, nextRole);
  clearLearnerPiiCookies();
  cacheLearnerProfile(learner);
  if (profile.countryCode && profile.countryName) {
    const cached = getCachedPricingRegion();
    const sameCountry =
      cached?.countryCode === profile.countryCode &&
      cached?.countryName === profile.countryName;
    if (!sameCountry) {
      cachePricingRegion(pricingRegionForCountry(profile.countryCode, profile.countryName));
      setPricingRevealed(true);
    }
  }
  const sessionChanged = prevEmail !== profile.email || prevRole !== nextRole;
  window.dispatchEvent(new Event("sft_auth_updated"));
  if (sessionChanged && profile.role !== "admin") {
    void syncEnrollmentsToServer(profile.email);
  }
  return learner;
}

/** Load profile from MySQL and refresh header / local session. */
export async function syncLearnerProfileFromServer(email: string): Promise<LearnerAuthProfile | null> {
  if (typeof window === "undefined" || !email.trim()) return null;
  try {
    const res = await fetch(`/api/auth/me`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      authenticated?: boolean;
      profile?: LmsUserProfilePayload;
    });
    // Stale localStorage after session deploy / logout / exclusive admin lock.
    if (res.status === 401 || data.authenticated === false) {
      const hadLocal = window.localStorage.getItem(AUTH_KEYS.loggedIn) === "true";
      if (hadLocal) {
        clearLearnerProfileStorage();
        window.dispatchEvent(new Event("sft_auth_updated"));
      }
      return null;
    }
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
    credentials: "include",
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
  const data = await readJsonResponse(res, { ok: false } as AuthRecordResult);
  if (!res.ok) {
    data.ok = false;
  }
  if (data.ok && data.region) {
    cachePricingRegion(data.region);
    setPricingRevealed(true);
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

/** Persist country choice to MySQL and refresh cached pricing region. */
export async function saveLearnerPricingCountry(countryCode: string): Promise<PricingRegion | null> {
  const email = getLearnerEmail();
  const code = countryCode.trim().toUpperCase();
  if (!email || !code) {
    return cachePricingRegionFromCountryCode(countryCode);
  }

  try {
    const res = await fetch("/api/pricing/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, countryCode: code }),
    });
    const data = await readJsonResponse(res, {} as { ok?: boolean; region?: PricingRegion });
    if (res.ok && data.region) {
      cachePricingRegion(data.region);
      window.dispatchEvent(new Event(PRICING_REGION_EVENT));
      return data.region;
    }
  } catch {
    /* fall through */
  }

  return cachePricingRegionFromCountryCode(code);
}

const PRICING_REGION_REFRESH_MS = 60_000;
let pricingRegionRefreshAt = 0;
let pricingRegionInflight: Promise<PricingRegion | null> | null = null;

export async function refreshPricingRegion(force = false): Promise<PricingRegion | null> {
  const email = getLearnerEmail();
  if (!email || !isLearnerLoggedIn()) return getCachedPricingRegion();

  const cached = getCachedPricingRegion();
  if (!force && cached && Date.now() - pricingRegionRefreshAt < PRICING_REGION_REFRESH_MS) {
    return cached;
  }
  if (pricingRegionInflight) return pricingRegionInflight;

  pricingRegionInflight = (async () => {
    try {
      const res = await fetch(`/api/pricing/region`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return getCachedPricingRegion();
      const data = await readJsonResponse(res, {} as { region?: PricingRegion });
      if (data.region) {
        cachePricingRegion(data.region, { notify: false });
        pricingRegionRefreshAt = Date.now();
        return data.region;
      }
    } catch {
      /* network / dev server unavailable — use cached region */
    }
    return getCachedPricingRegion();
  })().finally(() => {
    pricingRegionInflight = null;
  });

  return pricingRegionInflight;
}
