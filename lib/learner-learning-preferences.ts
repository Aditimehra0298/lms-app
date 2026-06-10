/** Learner preferences used for AI-style course recommendations (localStorage). */

import type { GoogleAccountRecommendationSignals } from "@/lib/google-account-recommendation-signals";
import { deriveGoogleAccountRecommendationSignals } from "@/lib/google-account-recommendation-signals";

export const LEARNING_PREFS_KEYS = {
  interests: "sft_learning_interests",
  goal: "sft_learning_goal",
  authProvider: "sft_auth_provider",
  googleSignals: "sft_google_recommendation_signals",
  prefsUpdated: "sft_learning_prefs_updated",
} as const;

export const LEARNING_PREFS_EVENT = "sft_learning_prefs_updated";

export const LEARNING_INTEREST_OPTIONS = [
  "Food Safety & HACCP",
  "Food Fraud & Mitigation",
  "Cybersecurity",
  "Compliance & Auditing",
  "Quality Management",
  "Leadership & Management",
  "Health & Safety",
  "Sustainability",
] as const;

export const LEARNING_GOAL_OPTIONS = [
  "Get certified for my role",
  "Switch career or upskill",
  "Meet compliance requirements",
  "Train my team",
  "Explore new topics",
] as const;

export type LearningPreferences = {
  interests: string[];
  goal: string;
  signedInWithGoogle: boolean;
  googleSignals: GoogleAccountRecommendationSignals | null;
};

function readGoogleSignalsFromStorage(): GoogleAccountRecommendationSignals | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEARNING_PREFS_KEYS.googleSignals);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleAccountRecommendationSignals;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLearningPreferences(): LearningPreferences {
  if (typeof window === "undefined") {
    return { interests: [], goal: "", signedInWithGoogle: false, googleSignals: null };
  }
  try {
    const raw = window.localStorage.getItem(LEARNING_PREFS_KEYS.interests);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    const interests = Array.isArray(parsed)
      ? parsed.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const goal = window.localStorage.getItem(LEARNING_PREFS_KEYS.goal)?.trim() ?? "";
    const signedInWithGoogle =
      window.localStorage.getItem(LEARNING_PREFS_KEYS.authProvider) === "google";
    return {
      interests,
      goal,
      signedInWithGoogle,
      googleSignals: readGoogleSignalsFromStorage(),
    };
  } catch {
    return { interests: [], goal: "", signedInWithGoogle: false, googleSignals: null };
  }
}

export function storeGoogleRecommendationSignals(signals: GoogleAccountRecommendationSignals): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNING_PREFS_KEYS.googleSignals, JSON.stringify(signals));
  window.dispatchEvent(new Event(LEARNING_PREFS_EVENT));
}

/** Merge Google-derived interests into prefs when the learner has not set any yet. */
export function applyGoogleRecommendationSignals(signals: GoogleAccountRecommendationSignals): void {
  if (typeof window === "undefined") return;
  storeGoogleRecommendationSignals(signals);
  const existing = readLearningPreferences();
  if (existing.interests.length === 0 && signals.suggestedInterests.length > 0) {
    writeLearningPreferences({ interests: signals.suggestedInterests });
  }
}

/** Re-derive Google signals client-side for returning Google users (e.g. before this feature shipped). */
export function ensureGoogleRecommendationSignals(email: string | undefined): GoogleAccountRecommendationSignals | null {
  if (typeof window === "undefined" || !email?.trim()) return null;
  const prefs = readLearningPreferences();
  if (!prefs.signedInWithGoogle) return prefs.googleSignals;
  if (prefs.googleSignals) return prefs.googleSignals;
  const signals = deriveGoogleAccountRecommendationSignals({ email: email.trim() });
  storeGoogleRecommendationSignals(signals);
  return signals;
}

export function writeLearningPreferences(prefs: {
  interests?: string[];
  goal?: string;
}): void {
  if (typeof window === "undefined") return;
  if (prefs.interests) {
    window.localStorage.setItem(
      LEARNING_PREFS_KEYS.interests,
      JSON.stringify(prefs.interests.filter(Boolean)),
    );
  }
  if (prefs.goal !== undefined) {
    if (prefs.goal.trim()) {
      window.localStorage.setItem(LEARNING_PREFS_KEYS.goal, prefs.goal.trim());
    } else {
      window.localStorage.removeItem(LEARNING_PREFS_KEYS.goal);
    }
  }
  window.dispatchEvent(new Event(LEARNING_PREFS_EVENT));
}

export function markLearnerAuthProvider(provider: "google" | "email"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNING_PREFS_KEYS.authProvider, provider);
  window.dispatchEvent(new Event(LEARNING_PREFS_EVENT));
}

/** When user registers, seed interests from industry / goal selections. */
export function seedPreferencesFromProfile(input: {
  industryType?: string;
  learningInterest?: string;
  learningGoal?: string;
}): void {
  const existing = readLearningPreferences();
  const interests = [...existing.interests];
  if (input.learningInterest?.trim() && !interests.includes(input.learningInterest.trim())) {
    interests.push(input.learningInterest.trim());
  }
  if (input.industryType?.trim()) {
    const mapped = industryToInterest(input.industryType.trim());
    if (mapped && !interests.includes(mapped)) interests.push(mapped);
  }
  writeLearningPreferences({
    interests,
    goal: input.learningGoal?.trim() || existing.goal,
  });
}

function industryToInterest(industry: string): string | null {
  const key = industry.toLowerCase();
  if (key.includes("food") || key.includes("beverage")) return "Food Safety & HACCP";
  if (key.includes("cyber") || key.includes("security")) return "Cybersecurity";
  if (key.includes("health")) return "Health & Safety";
  if (key.includes("tech") || key.includes("software") || key.includes("it")) return "Cybersecurity";
  if (key.includes("manufactur")) return "Quality Management";
  if (key.includes("finance")) return "Compliance & Auditing";
  return null;
}
