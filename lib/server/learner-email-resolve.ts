import { normalizeLearnerEmail } from "@/lib/learner-email";
import { prisma } from "@/lib/prisma";

function localAndDomain(email: string): { local: string; domain: string } | null {
  const n = normalizeLearnerEmail(email);
  const at = n.lastIndexOf("@");
  if (at < 1) return null;
  return { local: n.slice(0, at), domain: n.slice(at + 1) };
}

/** True when two emails are likely the same person (typo-tolerant on local part). */
export function emailsLikelySamePerson(a: string, b: string): boolean {
  const na = normalizeLearnerEmail(a);
  const nb = normalizeLearnerEmail(b);
  if (na === nb) return true;
  const pa = localAndDomain(na);
  const pb = localAndDomain(nb);
  if (!pa || !pb || pa.domain !== pb.domain) return false;
  if (pa.local === pb.local) return true;
  if (pa.local.includes(pb.local) || pb.local.includes(pa.local)) return true;
  if (Math.abs(pa.local.length - pb.local.length) > 2) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < pa.local.length && j < pb.local.length) {
    if (pa.local[i] === pb.local[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 2) return false;
    if (pa.local.length > pb.local.length) i++;
    else if (pb.local.length > pa.local.length) j++;
    else {
      i++;
      j++;
    }
  }
  edits += pa.local.length - i + (pb.local.length - j);
  return edits <= 2;
}

export type ResolvedLearner = {
  canonicalEmail: string;
  userId: string | null;
  identificationNumber: number | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  accountType: string | null;
  industryType: string | null;
  companyName: string | null;
};

/** Resolve purchase email to registered lms_user (exact or likely typo). */
export async function resolveLearnerForPurchaseEmail(
  rawEmail: string,
  usersOnCourse?: ResolvedLearner[],
): Promise<ResolvedLearner | null> {
  const normalized = normalizeLearnerEmail(rawEmail);
  if (!normalized.includes("@")) return null;

  const direct = await prisma.lmsUser.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      identificationNumber: true,
      phone: true,
      role: true,
      accountType: true,
      industryType: true,
      companyName: true,
    },
  });
  if (direct) {
    return {
      canonicalEmail: direct.email,
      userId: direct.id,
      identificationNumber: direct.identificationNumber,
      name: direct.name,
      phone: direct.phone,
      role: direct.role,
      accountType: direct.accountType,
      industryType: direct.industryType,
      companyName: direct.companyName,
    };
  }

  const domain = localAndDomain(normalized)?.domain;
  if (!domain) return null;

  const candidates = await prisma.lmsUser.findMany({
    where: { email: { endsWith: `@${domain}` } },
    select: {
      id: true,
      email: true,
      name: true,
      identificationNumber: true,
      phone: true,
      role: true,
      accountType: true,
      industryType: true,
      companyName: true,
    },
    take: 50,
  });

  for (const u of candidates) {
    if (emailsLikelySamePerson(normalized, u.email)) {
      return {
        canonicalEmail: u.email,
        userId: u.id,
        identificationNumber: u.identificationNumber,
        name: u.name,
        phone: u.phone,
        role: u.role,
        accountType: u.accountType,
        industryType: u.industryType,
        companyName: u.companyName,
      };
    }
  }

  if (usersOnCourse) {
    for (const u of usersOnCourse) {
      if (emailsLikelySamePerson(normalized, u.canonicalEmail)) return u;
    }
  }

  return null;
}
