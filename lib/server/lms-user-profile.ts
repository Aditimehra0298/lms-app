import type { AccountTypeId } from "@/lib/auth-profile";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import {
  formatIndividualRegistrationCode,
  formatOrganizationRegistrationCode,
} from "@/lib/registration-ids";
import { getOrganizationByWorkEmail } from "@/lib/server/organization-identification";
import { prisma } from "@/lib/prisma";

export type { LmsUserProfilePayload };

export const LMS_USER_PROFILE_SELECT = {
  email: true,
  name: true,
  role: true,
  accountType: true,
  avatarUrl: true,
  phone: true,
  companyName: true,
  personalEmail: true,
  industryType: true,
  companySize: true,
  countryCode: true,
  countryName: true,
  lastLoginAt: true,
  emailVerifiedAt: true,
  createdAt: true,
  identificationNumber: true,
  registrationMonth: true,
  registrationYear: true,
  registrationMonthYear: true,
} as const;

export async function fetchLmsUserProfile(email: string): Promise<LmsUserProfilePayload | null> {
  const user = await prisma.lmsUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: LMS_USER_PROFILE_SELECT,
  });
  if (!user) return null;
  const base = {
    ...serializeLmsUserProfile(user),
    ...registrationFieldsFromUser(user),
  };
  return enrichProfileWithRegistration(base, user.identificationNumber);
}

async function enrichProfileWithRegistration(
  profile: LmsUserProfilePayload,
  userIdentificationNumber: number | null,
): Promise<LmsUserProfilePayload> {
  if (profile.accountType === "organisation") {
    const org = await getOrganizationByWorkEmail(profile.email);
    if (org) {
      return {
        ...profile,
        identificationNumber: org.identificationNumber,
        registrationCode: formatOrganizationRegistrationCode(org.identificationNumber),
        organizationId: org.id,
        companyName: org.companyName,
        registrationMonth: org.registrationMonth,
        registrationYear: org.registrationYear,
        registrationMonthYear: org.registrationMonthYear,
      };
    }
    return profile;
  }
  if (userIdentificationNumber != null) {
    return {
      ...profile,
      identificationNumber: userIdentificationNumber,
      registrationCode: formatIndividualRegistrationCode(userIdentificationNumber),
    };
  }
  return profile;
}

function registrationFieldsFromUser(user: {
  registrationMonth?: number | null;
  registrationYear?: number | null;
  registrationMonthYear?: string | null;
}): Pick<
  LmsUserProfilePayload,
  "registrationMonth" | "registrationYear" | "registrationMonthYear"
> {
  return {
    registrationMonth: user.registrationMonth ?? null,
    registrationYear: user.registrationYear ?? null,
    registrationMonthYear: user.registrationMonthYear ?? null,
  };
}

export function serializeLmsUserProfile(user: {
  email: string;
  name: string | null;
  role: string;
  accountType: string | null;
  avatarUrl: string | null;
  phone: string | null;
  companyName: string | null;
  personalEmail: string | null;
  industryType: string | null;
  companySize: string | null;
  countryCode: string | null;
  countryName: string | null;
  lastLoginAt: Date | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  identificationNumber?: number | null;
}): LmsUserProfilePayload {
  const accountType = user.accountType as AccountTypeId | null;
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    accountType:
      accountType === "individual" || accountType === "organisation" || accountType === "self"
        ? accountType
        : null,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    companyName: user.companyName,
    personalEmail: user.personalEmail,
    industryType: user.industryType,
    companySize: user.companySize,
    countryCode: user.countryCode,
    countryName: user.countryName,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
