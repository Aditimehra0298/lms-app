import type { HomePageOrgPlan } from "@/lib/content-schema";
import { defaultOrgPlans } from "@/lib/content-schema";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { isOrgAllAccessActive } from "@/lib/organization-team-config";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";
import { ensureOrganizationTeam, readOrganizationTeam, writeOrganizationTeam } from "@/lib/server/organization-team-store";
import { syncOrganisationEnrollments } from "@/lib/server/organization-employee-accounts";

export const ORG_PLAN_NOTE_PREFIX = "org_plan:";

export type OrgCheckoutPlan = {
  key: string;
  title: string;
  amountInr: number;
  seats: number;
  durationMonths: number;
};

function amountFromPriceLabel(price: string): number | null {
  const n = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Plan definitions come from admin home-page pricing — the browser never supplies the price. */
export async function resolveOrgCheckoutPlan(key: string): Promise<OrgCheckoutPlan | null> {
  const wanted = key.trim();
  if (!wanted) return null;
  const home = await resolveHomePageConfig().catch(() => null);
  const plans: HomePageOrgPlan[] = home?.orgPlans?.length ? home.orgPlans : defaultOrgPlans;
  const plan = plans.find((p) => p.checkoutKey?.trim() === wanted);
  if (!plan) return null;
  const amountInr = amountFromPriceLabel(plan.price ?? "");
  if (!amountInr) return null;
  return {
    key: wanted,
    title: plan.title.replace(/^Most Popular\s*·\s*/i, "").trim() || wanted,
    amountInr,
    seats: Math.max(1, Math.round(plan.seats ?? 20)),
    durationMonths: Math.max(1, Math.round(plan.durationMonths ?? 12)),
  };
}

export function orgPlanKeyFromNote(note: string | null | undefined): string | null {
  const line = (note ?? "").split("\n").find((l) => l.startsWith(ORG_PLAN_NOTE_PREFIX));
  return line ? line.slice(ORG_PLAN_NOTE_PREFIX.length).trim() || null : null;
}

/** After a verified payment: turn on the all-access subscription (all self-paced courses, fixed seats). */
export async function activateOrgPlanSubscription(input: {
  orgEmail: string;
  planKey: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.orgEmail);
  if (!email) return { ok: false, message: "Organisation email missing on payment." };
  const plan = await resolveOrgCheckoutPlan(input.planKey);
  if (!plan) return { ok: false, message: "This plan is no longer available. Contact support." };

  const existing = (await readOrganizationTeam(email)) ?? (await ensureOrganizationTeam({ workEmail: email }));
  const now = new Date();
  const start = isOrgAllAccessActive(existing) ? new Date(existing.allAccess!.expiresAt) : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.durationMonths);

  await writeOrganizationTeam({
    ...existing,
    allAccess: {
      seats: plan.seats,
      startsAt: (isOrgAllAccessActive(existing) ? new Date(existing.allAccess!.startsAt) : now).toISOString(),
      expiresAt: end.toISOString(),
    },
  });
  await syncOrganisationEnrollments(email).catch((err) =>
    console.error("[org-plan] enrolment sync failed", err),
  );
  return { ok: true };
}

/** Refund of a plan payment: end the subscription and remove employee access granted through it. */
export async function cancelOrgPlanSubscription(orgEmail: string): Promise<void> {
  const email = normalizeLearnerEmail(orgEmail);
  if (!email) return;
  const existing = await readOrganizationTeam(email);
  if (!existing?.allAccess) return;
  await writeOrganizationTeam({ ...existing, allAccess: undefined });
  await syncOrganisationEnrollments(email).catch((err) =>
    console.error("[org-plan] enrolment sync after cancel failed", err),
  );
}
