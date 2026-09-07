import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";

export async function getUserBlockedAt(email: string): Promise<Date | null> {
  const normalized = normalizeLearnerEmail(email);
  if (!normalized) return null;
  try {
    const row = await prisma.lmsUser.findUnique({
      where: { email: normalized },
      select: { blockedAt: true },
    });
    return row?.blockedAt ?? null;
  } catch (err) {
    // Column may not exist until db push — fail open only for missing-column errors.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("blockedAt") || msg.includes("Unknown column") || msg.includes("Unknown argument")) {
      console.warn("[user-account-status] blockedAt column missing — run npx prisma db push");
      return null;
    }
    throw err;
  }
}

export async function isUserAccountBlocked(email: string): Promise<boolean> {
  return Boolean(await getUserBlockedAt(email));
}

export const ACCOUNT_BLOCKED_MESSAGE =
  "This account has been blocked by an administrator. Contact support if you believe this is a mistake.";
