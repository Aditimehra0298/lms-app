import type { AccountTypeId } from "@/lib/auth-profile";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
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
} as const;

export async function fetchLmsUserProfile(email: string): Promise<LmsUserProfilePayload | null> {
  const user = await prisma.lmsUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: LMS_USER_PROFILE_SELECT,
  });
  if (!user) return null;
  return serializeLmsUserProfile(user);
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
