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
  /** Permanent registration ID in MySQL (starts 101). Not a certificate number. */
  identificationNumber?: number | null;
  /** e.g. "101" or "101-org" — for n8n / display */
  registrationCode?: string | null;
  /** Set when accountType is organisation */
  organizationId?: string | null;
  /** 1–12 — month when user/org registered */
  registrationMonth?: number | null;
  /** e.g. 2026 */
  registrationYear?: number | null;
  /** e.g. 05-2026 */
  registrationMonthYear?: string | null;
};
