import type { AccountTypeId } from "@/lib/auth-profile";

/** User profile returned from API (MySQL). Safe for client imports. */
export type LmsUserProfilePayload = {
  email: string;
  name: string | null;
  role: string;
  accountType: AccountTypeId | null;
  avatarUrl: string | null;
  phone: string | null;
  companyName: string | null;
  personalEmail: string | null;
  industryType: string | null;
  companySize: string | null;
  countryCode: string | null;
  countryName: string | null;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};
