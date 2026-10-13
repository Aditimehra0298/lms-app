import type { HomePageOrgPlan } from "@/lib/content-schema";
import { defaultOrgPlans, orgTierRenewal, orgTierTotal } from "@/lib/content-schema";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { isOrgAllAccessActive } from "@/lib/organization-team-config";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";
import { ensureOrganizationTeam, readOrganizationTeam, writeOrganizationTeam } from "@/lib/server/organization-team-store";
import { syncOrganisationEnrollments } from "@/lib/server/organization-employee-accounts";
import { customPlanIdFromKey, getCustomPlanRequest, markCustomPlanPaid } from "@/lib/server/org-custom-proposal";

export const ORG_PLAN_NOTE_PREFIX = "org_plan:";

export type OrgCheckoutPlan = {
  key: string;
  title: string;
  /** Full (first-year) fee for the chosen seats. */
  amountInr: number;
  /** Fee when renewing the same seat tier. */
  renewalAmountInr: number;
  seats: number;
  durationMonths: number;
};

function amountFromPriceLabel(price: string): number | null {
  const n = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Plan definitions come from admin home-page pricing — the browser never supplies the price. */
export async function resolveOrgCheckoutPlan(key: string, seats?: number): Promise<OrgCheckoutPlan | null> {
  const wanted = key.trim();
  if (!wanted) return null;

  const customId = customPlanIdFromKey(wanted);
  if (customId) {
    const p = (await getCustomPlanRequest(customId))?.proposal;
    if (!p) return null;
    return {
      key: wanted,
      title: p.title,
      amountInr: p.amountInr,
      renewalAmountInr: p.amountInr,
      seats: p.seats,
      durationMonths: p.durationMonths,
    };
  }

  const home = await resolveHomePageConfig().catch(() => null);
  const plans: HomePageOrgPlan[] = home?.orgPlans?.length ? home.orgPlans : defaultOrgPlans;
  const plan = plans.find((p) => p.checkoutKey?.trim() === wanted);
  if (!plan) return null;
  const title = plan.title.replace(/^Most Popular\s*·\s*/i, "").trim() || wanted;
  const durationMonths = Math.max(1, Math.round(plan.durationMonths ?? 12));
  const renewalPercent = plan.renewalPercent ?? 100;

  const tiers = (plan.tiers ?? []).filter((t) => t.maxSeats > 0 && t.pricePerSeat > 0);
  if (tiers.length > 0) {
    const tier = tiers.find((t) => t.maxSeats === seats) ?? (seats ? null : tiers[0]);
    if (!tier) return null;
    return {
      key: wanted,
      title,
      amountInr: orgTierTotal(tier),
      renewalAmountInr: orgTierRenewal(tier, renewalPercent),
      seats: tier.maxSeats,
      durationMonths,
    };
  }

  const amountInr = amountFromPriceLabel(plan.price ?? "");
  if (!amountInr) return null;
  return {
    key: wanted,
    title,
    amountInr,
    renewalAmountInr: Math.round((amountInr * renewalPercent) / 100),
    seats: Math.max(1, Math.round(plan.seats ?? 20)),
    durationMonths,
  };
}

/** Renewal price applies when the organisation already had a subscription with the same seats. */
export async function isOrgPlanRenewal(orgEmail: string, seats: number): Promise<boolean> {
  const team = await readOrganizationTeam(orgEmail);
  return Boolean(team?.allAccess && team.allAccess.seats === seats);
}

export function orgPlanNote(key: string, seats: number): string {
  return `${ORG_PLAN_NOTE_PREFIX}${key}|${seats}`;
}

export function orgPlanFromNote(note: string | null | undefined): { key: string; seats?: number } | null {
  const line = (note ?? "").split("\n").find((l) => l.startsWith(ORG_PLAN_NOTE_PREFIX));
  if (!line) return null;
  const [key, seatsRaw] = line.slice(ORG_PLAN_NOTE_PREFIX.length).trim().split("|");
  if (!key) return null;
  const seats = Number(seatsRaw);
  return { key, seats: Number.isFinite(seats) && seats > 0 ? seats : undefined };
}

/** After a verified payment: turn on the all-access subscription (all self-paced courses, fixed seats). */
export async function activateOrgPlanSubscription(input: {
  orgEmail: string;
  planKey: string;
  seats?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeLearnerEmail(input.orgEmail);
  if (!email) return { ok: false, message: "Organisation email missing on payment." };
  const customId = customPlanIdFromKey(input.planKey);
  if (customId && (await getCustomPlanRequest(customId))?.proposal?.paidAt) return { ok: true };
  const plan = await resolveOrgCheckoutPlan(input.planKey, input.seats);
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
  if (customId) {
    await markCustomPlanPaid(customId).catch((err) => console.error("[org-plan] mark custom plan paid failed", err));
  }
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
