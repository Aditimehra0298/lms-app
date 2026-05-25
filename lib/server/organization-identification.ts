import {
  REGISTRATION_ID_START,
  registrationPeriodFromDate,
  type RegistrationPeriod,
} from "@/lib/registration-ids";
import { prisma } from "@/lib/prisma";

export type OrganizationRecord = {
  id: string;
  identificationNumber: number;
  companyName: string;
  workEmail: string;
  personalEmail: string | null;
  industryType: string | null;
  companySize: string | null;
  registrationMonth: number | null;
  registrationYear: number | null;
  registrationMonthYear: string | null;
};

/** Create or update organisation row; assign identificationNumber from 101 upward. */
export async function ensureOrganizationProfile(input: {
  workEmail: string;
  companyName: string;
  personalEmail?: string | null;
  industryType?: string | null;
  companySize?: string | null;
  userId?: string | null;
  registrationPeriod?: RegistrationPeriod;
}): Promise<OrganizationRecord | null> {
  const workEmail = input.workEmail.trim().toLowerCase();
  const companyName = input.companyName?.trim();
  if (!workEmail || !companyName) return null;

  const existing = await prisma.lmsOrganization.findUnique({
    where: { workEmail },
  });

  if (existing) {
    const updated = await prisma.lmsOrganization.update({
      where: { workEmail },
      data: {
        companyName,
        personalEmail: input.personalEmail?.trim().toLowerCase() ?? existing.personalEmail,
        industryType: input.industryType?.trim() ?? existing.industryType,
        companySize: input.companySize?.trim() ?? existing.companySize,
        userId: input.userId ?? existing.userId ?? undefined,
      },
    });
    return toRecord(updated);
  }

  const agg = await prisma.lmsOrganization.aggregate({
    _max: { identificationNumber: true },
  });
  const next = Math.max(
    REGISTRATION_ID_START,
    (agg._max.identificationNumber ?? REGISTRATION_ID_START - 1) + 1,
  );

  const period = input.registrationPeriod ?? registrationPeriodFromDate();
  const created = await prisma.lmsOrganization.create({
    data: {
      identificationNumber: next,
      companyName,
      workEmail,
      personalEmail: input.personalEmail?.trim().toLowerCase() ?? null,
      industryType: input.industryType?.trim() ?? null,
      companySize: input.companySize?.trim() ?? null,
      userId: input.userId ?? null,
      registrationMonth: period.registrationMonth,
      registrationYear: period.registrationYear,
      registrationMonthYear: period.registrationMonthYear,
    },
  });
  return toRecord(created);
}

export async function getOrganizationByWorkEmail(workEmail: string): Promise<OrganizationRecord | null> {
  const row = await prisma.lmsOrganization.findUnique({
    where: { workEmail: workEmail.trim().toLowerCase() },
  });
  return row ? toRecord(row) : null;
}

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  const rows = await prisma.lmsOrganization.findMany({
    orderBy: { identificationNumber: "asc" },
  });
  return rows.map(toRecord);
}

function toRecord(row: {
  id: string;
  identificationNumber: number;
  companyName: string;
  workEmail: string;
  personalEmail: string | null;
  industryType: string | null;
  companySize: string | null;
  registrationMonth?: number | null;
  registrationYear?: number | null;
  registrationMonthYear?: string | null;
}): OrganizationRecord {
  return {
    id: row.id,
    identificationNumber: row.identificationNumber,
    companyName: row.companyName,
    workEmail: row.workEmail,
    personalEmail: row.personalEmail,
    industryType: row.industryType,
    companySize: row.companySize,
    registrationMonth: row.registrationMonth ?? null,
    registrationYear: row.registrationYear ?? null,
    registrationMonthYear: row.registrationMonthYear ?? null,
  };
}
