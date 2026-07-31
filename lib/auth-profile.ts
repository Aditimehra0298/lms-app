import type { LmsUserProfilePayload } from "@/lib/lms-user-types";

export type AccountTypeId = "individual" | "organisation" | "self";

export type LearnerAuthProfile = {
  name?: string;
  accountType?: AccountTypeId;
  avatarUrl?: string;
  phone?: string;
  companyName?: string;
  personalEmail?: string;
  industryType?: string;
  companySize?: string;
  email?: string;
  role?: string;
  countryCode?: string;
  countryName?: string;
  /** Permanent MySQL learner/org ID (101, 102…) — same on every device after sign-in. */
  identificationNumber?: number;
  registrationCode?: string;
  registrationMonthYear?: string;
};

export const AUTH_PROFILE_KEYS = {
  accountType: "sft_account_type",
  avatarUrl: "sft_avatar_url",
  learnerName: "sft_learner_name",
  role: "sft_user_role",
  phone: "sft_learner_phone",
  companyName: "sft_company_name",
  personalEmail: "sft_personal_email",
  industryType: "sft_industry_type",
  companySize: "sft_company_size",
  identificationNumber: "sft_identification_number",
  registrationCode: "sft_registration_code",
  registrationMonthYear: "sft_registration_month_year",
} as const;

export function learnerProfileFromDb(profile: LmsUserProfilePayload): LearnerAuthProfile {
  return {
    email: profile.email,
    name: profile.name ?? undefined,
    accountType: profile.accountType ?? undefined,
    avatarUrl: profile.avatarUrl ?? undefined,
    phone: profile.phone ?? undefined,
    companyName: profile.companyName ?? undefined,
    personalEmail: profile.personalEmail ?? undefined,
    industryType: profile.industryType ?? undefined,
    companySize: profile.companySize ?? undefined,
    role: profile.role,
    countryCode: profile.countryCode ?? undefined,
    countryName: profile.countryName ?? undefined,
    identificationNumber: profile.identificationNumber ?? undefined,
    registrationCode: profile.registrationCode ?? undefined,
    registrationMonthYear: profile.registrationMonthYear ?? undefined,
  };
}

export function cacheLearnerProfile(profile: LearnerAuthProfile): void {
  if (typeof window === "undefined") return;
  if (profile.name?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.learnerName, profile.name.trim());
  }
  if (profile.accountType) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.accountType, profile.accountType);
  }
  if (profile.avatarUrl?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.avatarUrl, profile.avatarUrl.trim());
  }
  if (profile.role) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.role, profile.role);
  }
  if (profile.phone?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.phone, profile.phone.trim());
  }
  if (profile.companyName?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.companyName, profile.companyName.trim());
  }
  if (profile.personalEmail?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.personalEmail, profile.personalEmail.trim());
  }
  if (profile.industryType?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.industryType, profile.industryType.trim());
  }
  if (profile.companySize?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.companySize, profile.companySize.trim());
  }
  if (profile.identificationNumber != null && Number.isFinite(profile.identificationNumber)) {
    window.localStorage.setItem(
      AUTH_PROFILE_KEYS.identificationNumber,
      String(profile.identificationNumber),
    );
  }
  if (profile.registrationCode?.trim()) {
    window.localStorage.setItem(AUTH_PROFILE_KEYS.registrationCode, profile.registrationCode.trim());
  }
  if (profile.registrationMonthYear?.trim()) {
    window.localStorage.setItem(
      AUTH_PROFILE_KEYS.registrationMonthYear,
      profile.registrationMonthYear.trim(),
    );
  }
}

export function isOrganisationLearner(profile?: LearnerAuthProfile | null): boolean {
  return profile?.accountType === "organisation";
}

export function readLearnerProfileFromStorage(): LearnerAuthProfile {
  if (typeof window === "undefined") return {};
  const email = window.localStorage.getItem("sft_learner_email") ?? undefined;
  const accountType = window.localStorage.getItem(AUTH_PROFILE_KEYS.accountType) as AccountTypeId | null;
  return {
    email: email ?? undefined,
    name: window.localStorage.getItem(AUTH_PROFILE_KEYS.learnerName) ?? undefined,
    accountType:
      accountType === "individual" || accountType === "organisation" || accountType === "self"
        ? accountType
        : undefined,
    avatarUrl: window.localStorage.getItem(AUTH_PROFILE_KEYS.avatarUrl) ?? undefined,
    role: window.localStorage.getItem(AUTH_PROFILE_KEYS.role) ?? undefined,
    phone: window.localStorage.getItem(AUTH_PROFILE_KEYS.phone) ?? undefined,
    companyName: window.localStorage.getItem(AUTH_PROFILE_KEYS.companyName) ?? undefined,
    personalEmail: window.localStorage.getItem(AUTH_PROFILE_KEYS.personalEmail) ?? undefined,
    industryType: window.localStorage.getItem(AUTH_PROFILE_KEYS.industryType) ?? undefined,
    companySize: window.localStorage.getItem(AUTH_PROFILE_KEYS.companySize) ?? undefined,
    identificationNumber: (() => {
      const raw = window.localStorage.getItem(AUTH_PROFILE_KEYS.identificationNumber);
      if (!raw) return undefined;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : undefined;
    })(),
    registrationCode: window.localStorage.getItem(AUTH_PROFILE_KEYS.registrationCode) ?? undefined,
    registrationMonthYear:
      window.localStorage.getItem(AUTH_PROFILE_KEYS.registrationMonthYear) ?? undefined,
  };
}

export function clearLearnerProfileStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(AUTH_PROFILE_KEYS)) {
    window.localStorage.removeItem(key);
  }
}

export function profileInitial(name?: string | null, email?: string | null): string {
  const fromName = name?.trim()?.[0];
  if (fromName) return fromName.toUpperCase();
  const fromEmail = email?.trim()?.[0];
  if (fromEmail) return fromEmail.toUpperCase();
  return "U";
}

/** First name (or email local-part) for greetings — dashboard, chatbot, etc. */
export function learnerDisplayFirstName(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email?.trim().split("@")[0];
  if (local) {
    const cleaned = local.replace(/[._-]+/g, " ").trim();
    if (cleaned) {
      const word = cleaned.split(/\s+/)[0];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  }
  return "there";
}

/** Full display name for chatbot / personal greetings. */
export function learnerDisplayFullName(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed.replace(/\s+/g, " ");
  return learnerDisplayFirstName(name, email);
}

export function timeOfDayGreeting(date = new Date()): "Good Morning" | "Good Afternoon" | "Good Evening" {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
