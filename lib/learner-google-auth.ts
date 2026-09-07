import type { AccountTypeId, LearnerAuthProfile } from "@/lib/auth-profile";
import { cacheLearnerProfile, learnerProfileFromDb } from "@/lib/auth-profile";
import {
  AUTH_KEYS,
  applyDbProfileToSession,
  cachePricingRegion,
  type AuthCountryInput,
  type AuthRecordResult,
} from "@/lib/learner-session-client";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import type { PricingRegion } from "@/lib/country-pricing";
import { markLearnerAuthProvider, applyGoogleRecommendationSignals } from "@/lib/learner-learning-preferences";
import type { GoogleAccountRecommendationSignals } from "@/lib/google-account-recommendation-signals";
import { setPricingRevealed } from "@/lib/pricing-reveal";

export type GoogleAuthResult = AuthRecordResult & {
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
  accountType?: AccountTypeId;
  role?: string;
  region?: PricingRegion;
  profile?: LmsUserProfilePayload;
  googleRecommendationSignals?: GoogleAccountRecommendationSignals;
};

export async function signInWithGoogleAccessToken(
  accessToken: string,
  accountType: AccountTypeId,
  action: "login" | "register",
  country?: AuthCountryInput,
  adminVerifyToken?: string | null,
): Promise<GoogleAuthResult> {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      accessToken,
      accountType,
      action,
      countryCode: country?.countryCode,
      countryName: country?.countryName,
      adminVerifyToken: adminVerifyToken ?? undefined,
    }),
  });
  const data = (await res.json()) as GoogleAuthResult;
  if (!res.ok) {
    data.ok = false;
    return data;
  }
  if (data.ok && data.region) {
    cachePricingRegion(data.region);
    setPricingRevealed(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sft_auth_updated"));
    }
  }
  if (data.ok && data.profile) {
    applyDbProfileToSession(data.profile);
  } else if (data.ok && data.email) {
    cacheLearnerProfile({
      accountType: data.accountType ?? accountType,
      name: data.name ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
    });
  }
  if (data.ok && accountType !== "self") {
    markLearnerAuthProvider("google");
    if (data.googleRecommendationSignals) {
      applyGoogleRecommendationSignals(data.googleRecommendationSignals);
    }
  }
  return data;
}

export function applyGoogleSession(
  data: GoogleAuthResult,
  fallbackAccountType: AccountTypeId,
): { email: string; role: string; profile: LearnerAuthProfile } | null {
  if (!data.ok || !data.email) return null;

  window.localStorage.setItem(AUTH_KEYS.loggedIn, "true");

  if (data.region) {
    cachePricingRegion(data.region);
    setPricingRevealed(true);
  }

  const profile: LearnerAuthProfile = data.profile
    ? learnerProfileFromDb(data.profile)
    : {
        accountType: data.accountType ?? fallbackAccountType,
        name: data.name ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
      };

  window.localStorage.setItem(AUTH_KEYS.email, data.email);
  window.localStorage.setItem(AUTH_KEYS.role, data.role === "admin" ? "admin" : "learner");
  if (data.profile) {
    applyDbProfileToSession(data.profile);
  } else {
    cacheLearnerProfile(profile);
    window.dispatchEvent(new Event("sft_auth_updated"));
  }

  return { email: data.email, role: data.role === "admin" ? "admin" : "learner", profile };
}
