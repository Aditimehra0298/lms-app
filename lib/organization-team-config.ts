/** Admin-managed organisation premium tiers + shared team record types. */

export type OrgPremiumPlanId = "monthly-premium" | "early-program" | "premium-package";

export type OrganizationPremiumPlanConfig = {
  id: OrgPremiumPlanId;
  name: string;
  tagline: string;
  defaultSeatLimit: number;
  minSeatLimit: number;
  maxSeatLimit: number;
  seatLimitConfigurable: boolean;
  anyCourseAccess: boolean;
  billingLabel: string;
  priceLabel?: string;
  billingSuffix?: string;
  priceNote?: string;
  features: string[];
  highlighted?: boolean;
  published?: boolean;
};

export type OrganizationTeamAdminConfig = {
  defaultPlanId: OrgPremiumPlanId;
  /** Use `{seats}` placeholder — replaced at runtime */
  learningRuleTemplate: string;
  plans: OrganizationPremiumPlanConfig[];
};

export type OrgTeamRosterEntry = {
  slot: number;
  id: string;
  name: string;
  email: string;
  position: string;
  avatarUrl?: string;
  invited: boolean;
};

export type OrganizationTeamRecord = {
  workEmail: string;
  companyName?: string;
  planId: OrgPremiumPlanId;
  seatLimit?: number;
  roster: OrgTeamRosterEntry[];
  courseAssignments: Record<string, string[]>;
  updatedAt: string;
};

export const ORG_PREMIUM_PLAN_IDS: OrgPremiumPlanId[] = [
  "monthly-premium",
  "early-program",
  "premium-package",
];

export const defaultOrganizationTeamAdminConfig: OrganizationTeamAdminConfig = {
  defaultPlanId: "monthly-premium",
  learningRuleTemplate:
    "{seats} employees can learn any course on your plan. Each employee may be assigned to more than one course.",
  plans: [
    {
      id: "monthly-premium",
      name: "Monthly Premium",
      tagline: "Up to 20 employees — any course, billed monthly",
      defaultSeatLimit: 20,
      minSeatLimit: 1,
      maxSeatLimit: 50,
      seatLimitConfigurable: true,
      anyCourseAccess: true,
      billingLabel: "Monthly",
      priceLabel: "Per seat",
      billingSuffix: "/ month",
      priceNote: "20 employees · any course · multiple courses per person",
      features: [
        "Up to 20 employees can learn (seat count adjustable in admin)",
        "Full catalog — any self-paced or tutor-led course",
        "Each employee may take multiple courses",
        "Team progress, assignments, and certificates",
        "Monthly billing",
      ],
      published: true,
    },
    {
      id: "early-program",
      name: "Early Program",
      tagline: "50+ employees — full catalog, annual early access",
      defaultSeatLimit: 50,
      minSeatLimit: 50,
      maxSeatLimit: 200,
      seatLimitConfigurable: true,
      anyCourseAccess: true,
      billingLabel: "Annual · Early access",
      priceLabel: "Annual early access",
      priceNote: "50+ employees · full catalog",
      features: [
        "50+ employees (adjustable for larger teams)",
        "Any course in the catalog for every seat",
        "Each employee may enroll in multiple programs",
        "Organisation reporting and compliance tracking",
        "Priority onboarding support",
      ],
      highlighted: true,
      published: true,
    },
    {
      id: "premium-package",
      name: "Premium Package",
      tagline: "124 employees — unlimited catalog access",
      defaultSeatLimit: 124,
      minSeatLimit: 50,
      maxSeatLimit: 500,
      seatLimitConfigurable: true,
      anyCourseAccess: true,
      billingLabel: "Annual · Premium",
      priceLabel: "Annual premium",
      priceNote: "124 employees · any course in catalog",
      features: [
        "Up to 124 employees can learn any course",
        "Full catalog including specialist programs",
        "Multiple courses per employee",
        "Advanced team reports and calendar",
        "Dedicated account support",
      ],
      published: true,
    },
  ],
};

export function mergeOrganizationTeamAdminConfig(
  partial?: Partial<OrganizationTeamAdminConfig> | null,
): OrganizationTeamAdminConfig {
  const base = defaultOrganizationTeamAdminConfig;
  if (!partial) return base;

  const plansById = new Map(base.plans.map((p) => [p.id, { ...p }]));
  for (const row of partial.plans ?? []) {
    if (!row?.id || !plansById.has(row.id)) continue;
    plansById.set(row.id, { ...plansById.get(row.id)!, ...row, id: row.id });
  }

  return {
    defaultPlanId:
      partial.defaultPlanId && plansById.has(partial.defaultPlanId)
        ? partial.defaultPlanId
        : base.defaultPlanId,
    learningRuleTemplate: partial.learningRuleTemplate?.trim() || base.learningRuleTemplate,
    plans: ORG_PREMIUM_PLAN_IDS.map((id) => plansById.get(id)!),
  };
}

export function getOrganizationPremiumPlanConfig(
  planId: OrgPremiumPlanId,
  adminConfig = defaultOrganizationTeamAdminConfig,
): OrganizationPremiumPlanConfig {
  return (
    adminConfig.plans.find((p) => p.id === planId) ??
    defaultOrganizationTeamAdminConfig.plans.find((p) => p.id === planId)!
  );
}

export function clampSeatLimitForPlanConfig(
  plan: OrganizationPremiumPlanConfig,
  seats: number,
): number {
  return Math.min(plan.maxSeatLimit, Math.max(plan.minSeatLimit, Math.round(seats)));
}

export function resolveSeatLimitForOrg(
  planId: OrgPremiumPlanId,
  seatOverride: number | undefined,
  adminConfig = defaultOrganizationTeamAdminConfig,
): number {
  const plan = getOrganizationPremiumPlanConfig(planId, adminConfig);
  const raw = seatOverride ?? plan.defaultSeatLimit;
  return clampSeatLimitForPlanConfig(plan, raw);
}

export function formatOrgLearningRule(
  seats: number,
  adminConfig = defaultOrganizationTeamAdminConfig,
): string {
  return adminConfig.learningRuleTemplate.replace(/\{seats\}/g, String(seats));
}

export function orgPremiumPlanIdToPurchaseType(
  planId: OrgPremiumPlanId,
): "monthly" | "yearly" | "premium" {
  if (planId === "monthly-premium") return "monthly";
  if (planId === "early-program") return "yearly";
  return "premium";
}

export function orgPremiumPlanLabelFromPurchaseType(
  planType: "monthly" | "yearly" | "premium" | "per-course",
  adminConfig = defaultOrganizationTeamAdminConfig,
): string {
  if (planType === "monthly") return getOrganizationPremiumPlanConfig("monthly-premium", adminConfig).name;
  if (planType === "yearly") return getOrganizationPremiumPlanConfig("early-program", adminConfig).name;
  if (planType === "premium") return getOrganizationPremiumPlanConfig("premium-package", adminConfig).name;
  return "Per-course purchase";
}
