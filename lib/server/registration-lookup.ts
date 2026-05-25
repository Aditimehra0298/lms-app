import {
  formatIndividualRegistrationCode,
  formatOrganizationRegistrationCode,
} from "@/lib/registration-ids";
import { getOrganizationByWorkEmail } from "@/lib/server/organization-identification";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { prisma } from "@/lib/prisma";

export type RegistrationLookupResult = {
  email: string;
  name: string | null;
  accountType: string | null;
  identificationNumber: number | null;
  registrationCode: string | null;
  organizationId: string | null;
  companyName: string | null;
  registrationMonth: number | null;
  registrationYear: number | null;
  registrationMonthYear: string | null;
  phone: string | null;
  countryCode: string | null;
  countryName: string | null;
};

export async function lookupRegistrationByEmail(email: string): Promise<RegistrationLookupResult | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.lmsUser.findUnique({
    where: { email: normalized },
    select: {
      email: true,
      name: true,
      accountType: true,
      identificationNumber: true,
      companyName: true,
      registrationMonth: true,
      registrationYear: true,
      registrationMonthYear: true,
      phone: true,
      countryCode: true,
      countryName: true,
    },
  });
  if (!user) return null;

  if (user.accountType === "organisation") {
    const org = await getOrganizationByWorkEmail(normalized);
    if (org) {
      return {
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        identificationNumber: org.identificationNumber,
        registrationCode: formatOrganizationRegistrationCode(org.identificationNumber),
        organizationId: org.id,
        companyName: org.companyName,
        registrationMonth: org.registrationMonth,
        registrationYear: org.registrationYear,
        registrationMonthYear: org.registrationMonthYear,
        phone: user.phone,
        countryCode: user.countryCode,
        countryName: user.countryName,
      };
    }
    return {
      email: user.email,
      name: user.name,
      accountType: user.accountType,
      identificationNumber: null,
      registrationCode: null,
      organizationId: null,
      companyName: user.companyName,
      registrationMonth: user.registrationMonth,
      registrationYear: user.registrationYear,
      registrationMonthYear: user.registrationMonthYear,
      phone: user.phone,
      countryCode: user.countryCode,
      countryName: user.countryName,
    };
  }

  let id = user.identificationNumber;
  if (id == null) {
    id = await ensureUserIdentificationNumber(normalized);
  }

  return {
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    identificationNumber: id,
    registrationCode: id != null ? formatIndividualRegistrationCode(id) : null,
    organizationId: null,
    companyName: user.companyName,
    registrationMonth: user.registrationMonth,
    registrationYear: user.registrationYear,
    registrationMonthYear: user.registrationMonthYear,
    phone: user.phone,
    countryCode: user.countryCode,
    countryName: user.countryName,
  };
}
