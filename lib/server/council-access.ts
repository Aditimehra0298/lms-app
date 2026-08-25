import { prisma } from "@/lib/prisma";
import { isMainAdminEmail } from "@/lib/server/admin-emails";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export type CouncilAccess = {
  email: string;
  isGlobalAdmin: boolean;
  /** When set, staff may only read/write this organisation (institute). */
  organizationId: string | null;
  organizationUid: string | null;
  organizationName: string | null;
  staffRole: string | null;
};

/** Resolve who can access Council admin data (global vs institute-scoped). */
export async function resolveCouncilAccess(rawEmail: string | null | undefined): Promise<CouncilAccess | null> {
  const email = normalizeLearnerEmail(rawEmail ?? "");
  if (!email) return null;

  if (isMainAdminEmail(email)) {
    return {
      email,
      isGlobalAdmin: true,
      organizationId: null,
      organizationUid: null,
      organizationName: null,
      staffRole: null,
    };
  }

  const staff = await prisma.instituteStaffLink.findUnique({
    where: { email },
    include: {
      organization: { select: { id: true, identificationNumber: true, companyName: true } },
    },
  });
  if (!staff) return null;

  return {
    email,
    isGlobalAdmin: false,
    organizationId: staff.organizationId,
    organizationUid: `ORG-${staff.organization.identificationNumber}`,
    organizationName: staff.organization.companyName,
    staffRole: staff.role,
  };
}

export function orgScope(
  access: CouncilAccess,
  requestedOrgId?: string | null,
): { organizationId?: string } {
  if (!access.isGlobalAdmin) {
    return access.organizationId ? { organizationId: access.organizationId } : { organizationId: "__none__" };
  }
  const id = requestedOrgId?.trim();
  return id ? { organizationId: id } : {};
}

export function nextStudentUid(n: number): string {
  return `SFT-STU-${String(n).padStart(4, "0")}`;
}
