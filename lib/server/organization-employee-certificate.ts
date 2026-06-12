import { allocateSftCertificateNumber } from "@/lib/server/certificate-number-issue";
import { allocateDelegateNumber } from "@/lib/server/delegate-number-issue";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { getOrganizationByWorkEmail } from "@/lib/server/organization-identification";
import { prisma } from "@/lib/prisma";

/**
 * Issue a certificate for an organisation employee using the individual number pattern
 * (YYYY-MM-courseId-trainingId/userId and YYYY-verifyNumber-userId — no `-org` suffix).
 */
export async function resolveEmployeeCertificateIdentity(input: {
  employeeEmail: string;
  organizationWorkEmail?: string | null;
}): Promise<
  | {
      ok: true;
      identificationNumber: number;
      userId: string | null;
      organizationId: string | null;
      holderType: "individual";
    }
  | { ok: false; message: string }
> {
  const employeeEmail = input.employeeEmail.trim().toLowerCase();
  if (!employeeEmail) {
    return { ok: false, message: "Employee email is required." };
  }

  const identificationNumber = await ensureUserIdentificationNumber(employeeEmail);
  if (identificationNumber == null) {
    return {
      ok: false,
      message: "Employee must be registered in the database before issuing a certificate.",
    };
  }

  const user = await prisma.lmsUser.findUnique({
    where: { email: employeeEmail },
    select: { id: true },
  });

  let organizationId: string | null = null;
  const orgEmail = input.organizationWorkEmail?.trim().toLowerCase();
  if (orgEmail) {
    const org = await getOrganizationByWorkEmail(orgEmail);
    organizationId = org?.id ?? null;
  }

  return {
    ok: true,
    identificationNumber,
    userId: user?.id ?? null,
    organizationId,
    holderType: "individual",
  };
}

export async function allocateEmployeeCertificateNumbers(input: {
  employeeEmail: string;
  organizationWorkEmail?: string | null;
  courseIdentificationNumber: number;
  issuedAt?: Date;
}): Promise<
  | {
      ok: true;
      identificationNumber: number;
      userId: string | null;
      organizationId: string | null;
      certificateNumber: string;
      delegateNumber: string;
      verifyNumber: number;
      holderType: "individual";
    }
  | { ok: false; message: string }
> {
  const identity = await resolveEmployeeCertificateIdentity({
    employeeEmail: input.employeeEmail,
    organizationWorkEmail: input.organizationWorkEmail,
  });
  if (!identity.ok) return identity;

  const issuedAt = input.issuedAt ?? new Date();
  const certificateNumber = await allocateSftCertificateNumber({
    courseIdentificationNumber: input.courseIdentificationNumber,
    userIdentificationNumber: identity.identificationNumber,
    holderType: "individual",
    issuedAt,
  });
  const { delegateNumber, verifyNumber } = await allocateDelegateNumber({
    userIdentificationNumber: identity.identificationNumber,
    holderType: "individual",
    issuedAt,
  });

  return {
    ok: true,
    identificationNumber: identity.identificationNumber,
    userId: identity.userId,
    organizationId: identity.organizationId,
    certificateNumber,
    delegateNumber,
    verifyNumber,
    holderType: "individual",
  };
}
