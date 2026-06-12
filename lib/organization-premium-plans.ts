/**
 * Organisation premium plan runtime — definitions from admin CMS, active state from server team record.
 */

import {
  formatOrgLearningRule,
  getOrganizationPremiumPlanConfig,
  mergeOrganizationTeamAdminConfig,
  orgPremiumPlanIdToPurchaseType,
  orgPremiumPlanLabelFromPurchaseType,
  resolveSeatLimitForOrg,
  type OrgPremiumPlanId,
  type OrganizationPremiumPlanConfig,
} from "@/lib/organization-team-config";
import {
  getCachedOrganizationTeamRecord,
  getOrganizationTeamAdminConfig,
  ORG_PREMIUM_PLAN_EVENT,
  saveOrganizationTeamToServer,
  setOrganizationTeamAdminConfig,
} from "@/lib/organization-team-sync-client";

export type { OrgPremiumPlanId };
export { ORG_PREMIUM_PLAN_EVENT, setOrganizationTeamAdminConfig };

export type OrgPremiumPlanState = {
  planId: OrgPremiumPlanId;
  seatLimit?: number;
};

export type OrgPremiumPlanDefinition = OrganizationPremiumPlanConfig & {
  seatLimit: number;
};

export function readOrgPremiumPlanState(): OrgPremiumPlanState {
  const record = getCachedOrganizationTeamRecord();
  const admin = getOrganizationTeamAdminConfig();
  if (record) {
    return { planId: record.planId, seatLimit: record.seatLimit };
  }
  return { planId: admin.defaultPlanId, seatLimit: undefined };
}

export function resolveOrgSeatLimit(state?: OrgPremiumPlanState): number {
  const admin = getOrganizationTeamAdminConfig();
  const s = state ?? readOrgPremiumPlanState();
  return resolveSeatLimitForOrg(s.planId, s.seatLimit, admin);
}

export function getActiveOrgPremiumPlan(state?: OrgPremiumPlanState): OrgPremiumPlanDefinition {
  const admin = getOrganizationTeamAdminConfig();
  const s = state ?? readOrgPremiumPlanState();
  const plan = getOrganizationPremiumPlanConfig(s.planId, admin);
  return { ...plan, seatLimit: resolveOrgSeatLimit(s) };
}

export function getOrgPremiumPlansCatalog(): OrganizationPremiumPlanConfig[] {
  return getOrganizationTeamAdminConfig().plans.filter((p) => p.published !== false);
}

export async function setActiveOrgPremiumPlan(planId: OrgPremiumPlanId, seatLimit?: number) {
  const admin = getOrganizationTeamAdminConfig();
  const plan = getOrganizationPremiumPlanConfig(planId, admin);
  const nextLimit =
    seatLimit !== undefined ? resolveSeatLimitForOrg(planId, seatLimit, admin) : plan.defaultSeatLimit;
  const result = await saveOrganizationTeamToServer({ planId, seatLimit: nextLimit });
  return { planId, seatLimit: nextLimit, ok: result.ok };
}

export async function updateOrgPremiumSeatLimit(seatLimit: number) {
  const current = readOrgPremiumPlanState();
  return setActiveOrgPremiumPlan(current.planId, seatLimit);
}

export function orgPremiumPlanLearningRule(plan = getActiveOrgPremiumPlan()): string {
  return formatOrgLearningRule(plan.seatLimit, getOrganizationTeamAdminConfig());
}

export { orgPremiumPlanLabelFromPurchaseType, orgPremiumPlanIdToPurchaseType };

/** @deprecated use getOrgPremiumPlansCatalog — kept for imports */
export const ORG_PREMIUM_PLANS = mergeOrganizationTeamAdminConfig().plans.reduce(
  (acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  },
  {} as Record<OrgPremiumPlanId, OrganizationPremiumPlanConfig>,
);

export function defaultOrgPremiumPlanState(): OrgPremiumPlanState {
  const admin = mergeOrganizationTeamAdminConfig();
  const plan = getOrganizationPremiumPlanConfig(admin.defaultPlanId, admin);
  return { planId: admin.defaultPlanId, seatLimit: plan.defaultSeatLimit };
}

export function clampSeatLimitForPlan(planId: OrgPremiumPlanId, seats: number): number {
  const admin = getOrganizationTeamAdminConfig();
  const plan = getOrganizationPremiumPlanConfig(planId, admin);
  return Math.min(plan.maxSeatLimit, Math.max(plan.minSeatLimit, Math.round(seats)));
}
