import type { AccountTypeId } from "@/lib/auth-profile";

export const PROFILE_INDUSTRY_OPTIONS = [
  "Food & Beverage",
  "Manufacturing",
  "Healthcare",
  "Hospitality",
  "Technology",
  "Cybersecurity",
  "Finance",
  "Education",
  "Other",
] as const;

export const REGISTRATION_INDUSTRY_OPTIONS = [
  "Technology",
  "Information Technology",
  "Software & IT",
  "Cybersecurity",
  "Finance",
  "Healthcare",
  "Food & Beverage",
  "Manufacturing",
  "Hospitality",
  "Education",
  "Other",
] as const;

export const PROFILE_COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export type LearnerProfileFormValues = {
  name: string;
  phone: string;
  companyName: string;
  personalEmail: string;
  industryType: string;
  companySize: string;
};

export function emptyProfileForm(): LearnerProfileFormValues {
  return {
    name: "",
    phone: "",
    companyName: "",
    personalEmail: "",
    industryType: "",
    companySize: "",
  };
}

export function profileFormFromPayload(input: {
  name?: string | null;
  phone?: string | null;
  companyName?: string | null;
  personalEmail?: string | null;
  industryType?: string | null;
  companySize?: string | null;
}): LearnerProfileFormValues {
  return {
    name: input.name?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    companyName: input.companyName?.trim() ?? "",
    personalEmail: input.personalEmail?.trim() ?? "",
    industryType: input.industryType?.trim() ?? "",
    companySize: input.companySize?.trim() ?? "",
  };
}

export function accountTypeLabel(type?: AccountTypeId | string | null): string {
  if (type === "organisation") return "Organisation";
  if (type === "individual") return "Individual trainee";
  if (type === "self") return "Admin";
  return "Learner";
}

export const profileFieldClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none";

export const profileLabelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-amber-200/80";
