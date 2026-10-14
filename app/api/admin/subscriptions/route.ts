import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { isSubscriptionActive, listAllLearnerSubscriptions } from "@/lib/server/learner-plan-subscription";
import { ORG_PLAN_NOTE_PREFIX } from "@/lib/server/organization-plan-subscription";
import { listOrganizations } from "@/lib/server/organization-identification";
import { readAllOrganizationTeams } from "@/lib/server/organization-team-store";
import { isOrgAllAccessActive, rosterEntryHasLogin } from "@/lib/organization-team-config";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export type SubscriptionPayment = {
  orderId: string;
  amountInr: number;
  status: string;
  paidAt: string | null;
};

export type IndividualSubscriptionRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  planTitle: string;
  planKey: string;
  scope: "all" | "category";
  categoryTitle: string | null;
  startsAt: string;
  expiresAt: string;
  endedAt: string | null;
  status: SubscriptionStatus;
  coursesUnlocked: number;
  payments: SubscriptionPayment[];
  totalPaidInr: number;
};

export type OrganisationSubscriptionRow = {
  workEmail: string;
  companyName: string;
  identificationNumber: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  seats: number;
  employeesUsed: number;
  startsAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
  employees: { name: string; email: string; position: string; hasLogin: boolean }[];
  payments: SubscriptionPayment[];
  totalPaidInr: number;
};

function toPayment(p: {
  razorpayOrderId: string | null;
  id: string;
  amount: number;
  status: string;
  paidAt: Date | null;
}): SubscriptionPayment {
  return {
    orderId: p.razorpayOrderId ?? p.id,
    amountInr: Math.round(p.amount / 100),
    status: p.status,
    paidAt: p.paidAt?.toISOString() ?? null,
  };
}

function paidTotal(payments: SubscriptionPayment[]): number {
  return payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountInr, 0);
}

/** Individual plan subscriptions and organisation all-access subscriptions, with their payments. */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const [learnerSubs, teams, orgs, planPayments] = await Promise.all([
      listAllLearnerSubscriptions(),
      readAllOrganizationTeams(),
      listOrganizations().catch(() => []),
      prisma.lmsPayment
        .findMany({
          where: { adminNote: { contains: "_plan:" } },
          select: {
            id: true,
            learnerEmail: true,
            razorpayOrderId: true,
            amount: true,
            status: true,
            paidAt: true,
            adminNote: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        })
        .catch(() => []),
    ]);

    const orgTeams = teams.filter((t) => t.allAccess);
    const emails = new Set<string>([
      ...learnerSubs.map((s) => s.email),
      ...orgTeams.map((t) => t.workEmail.toLowerCase()),
    ]);
    const users = await prisma.lmsUser
      .findMany({
        where: { email: { in: Array.from(emails) } },
        select: { email: true, name: true, phone: true },
      })
      .catch(() => []);
    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const paymentByOrder = new Map(planPayments.filter((p) => p.razorpayOrderId).map((p) => [p.razorpayOrderId!, p]));
    const orgByEmail = new Map(orgs.map((o) => [o.workEmail.toLowerCase(), o]));
    const now = Date.now();

    const individual: IndividualSubscriptionRow[] = learnerSubs
      .map((s) => {
        const user = userByEmail.get(s.email);
        const payments = s.orderIds
          .map((id) => paymentByOrder.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map(toPayment);
        const status: SubscriptionStatus = s.endedAt && Date.parse(s.expiresAt) > Date.parse(s.endedAt)
          ? "cancelled"
          : isSubscriptionActive(s, now)
            ? "active"
            : "expired";
        return {
          id: s.id,
          email: s.email,
          name: user?.name ?? null,
          phone: user?.phone ?? null,
          planTitle: s.title,
          planKey: s.planKey,
          scope: s.scope,
          categoryTitle: s.categoryTitle ?? null,
          startsAt: s.startsAt,
          expiresAt: s.expiresAt,
          endedAt: s.endedAt ?? null,
          status,
          coursesUnlocked: s.grantedSlugs.length,
          payments,
          totalPaidInr: paidTotal(payments),
        };
      })
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

    const organisations: OrganisationSubscriptionRow[] = orgTeams
      .map((t) => {
        const email = t.workEmail.toLowerCase();
        const org = orgByEmail.get(email);
        const owner = userByEmail.get(email);
        const employees = t.roster
          .filter((r) => r.name.trim() || r.email.trim())
          .map((r) => ({
            name: r.name.trim(),
            email: r.email.trim(),
            position: r.position.trim(),
            hasLogin: rosterEntryHasLogin(r),
          }));
        const payments = planPayments
          .filter((p) => p.learnerEmail.toLowerCase() === email && (p.adminNote ?? "").includes(ORG_PLAN_NOTE_PREFIX))
          .map(toPayment);
        return {
          workEmail: email,
          companyName: org?.companyName || t.companyName || email,
          identificationNumber: org?.identificationNumber ?? null,
          ownerName: owner?.name ?? null,
          ownerPhone: owner?.phone ?? null,
          seats: t.allAccess!.seats,
          employeesUsed: employees.length,
          startsAt: t.allAccess!.startsAt,
          expiresAt: t.allAccess!.expiresAt,
          status: (isOrgAllAccessActive(t) ? "active" : "expired") as SubscriptionStatus,
          employees,
          payments,
          totalPaidInr: paidTotal(payments),
        };
      })
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

    return NextResponse.json({ ok: true, individual, organisations }, { headers: noStoreJson });
  } catch (err) {
    console.error("[admin/subscriptions GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load subscriptions." },
      { status: 503, headers: noStoreJson },
    );
  }
}
