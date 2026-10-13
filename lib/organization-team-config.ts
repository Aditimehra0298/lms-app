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
  /** Server-only: when this org created the employee's login (email + password). */
  loginCreatedAt?: string;
  /** Server-only: email already had an account; linked instead of creating one. */
  loginLinkedAt?: string;
  /** Server-only: course slugs this org enrolled the employee in (removed on unassign). */
  orgEnrolledSlugs?: string[];
};

export const ORG_ROSTER_SERVER_FIELDS = ["loginCreatedAt", "loginLinkedAt", "orgEnrolledSlugs"] as const;

export function rosterEntryHasLogin(row: Pick<OrgTeamRosterEntry, "loginCreatedAt" | "loginLinkedAt">): boolean {
  return Boolean(row.loginCreatedAt || row.loginLinkedAt);
}

/** Placeholder employees seeded by older builds (john.smith@team.demo etc.). */
export function isDemoRosterEntry(row: Pick<OrgTeamRosterEntry, "email">): boolean {
  return /@team\.demo$/i.test(row.email?.trim() ?? "");
}

export function emptyRosterSlot(slot: number): OrgTeamRosterEntry {
  return { slot, id: `slot-${slot}`, name: "", email: "", position: "", avatarUrl: undefined, invited: false };
}

/** Clears demo seats and drops their ids from course assignments. */
export function stripDemoTeamData<T extends { roster: OrgTeamRosterEntry[]; courseAssignments: Record<string, string[]> }>(
  record: T,
): T {
  const demoIds = new Set(record.roster.filter(isDemoRosterEntry).map((r) => r.id));
  if (demoIds.size === 0) return record;
  const courseAssignments: Record<string, string[]> = {};
  for (const [slug, ids] of Object.entries(record.courseAssignments ?? {})) {
    courseAssignments[slug] = ids.filter((id) => !demoIds.has(id));
  }
  return {
    ...record,
    roster: record.roster.map((r) => (isDemoRosterEntry(r) ? emptyRosterSlot(r.slot) : r)),
    courseAssignments,
  };
}

/** Admin-granted yearly subscription: every self-paced course, fixed seat count. */
export type OrgAllAccessSubscription = {
  seats: number;
  startsAt: string;
  expiresAt: string;
};

export type OrganizationTeamRecord = {
  workEmail: string;
  companyName?: string;
  planId: OrgPremiumPlanId;
  seatLimit?: number;
  roster: OrgTeamRosterEntry[];
  courseAssignments: Record<string, string[]>;
  /** Set only by the main admin — never accepted from the organisation's browser. */
  allAccess?: OrgAllAccessSubscription;
  updatedAt: string;
};

export const ORG_ALL_ACCESS_DEFAULT_SEATS = 20;

export function isOrgAllAccessActive(
  record?: Pick<OrganizationTeamRecord, "allAccess"> | null,
  now: Date = new Date(),
): boolean {
  const sub = record?.allAccess;
  if (!sub) return false;
  const start = Date.parse(sub.startsAt);
  const end = Date.parse(sub.expiresAt);
  if (!Number.isFinite(end)) return false;
  const t = now.getTime();
  return (!Number.isFinite(start) || start <= t) && t < end;
}

export function normalizeOrgAllAccess(input: unknown): OrgAllAccessSubscription | undefined {
  if (!input || typeof input !== "object") return undefined;
  const row = input as Partial<OrgAllAccessSubscription>;
  const end = Date.parse(String(row.expiresAt ?? ""));
  if (!Number.isFinite(end)) return undefined;
  const start = Date.parse(String(row.startsAt ?? ""));
  const seats = Math.round(Number(row.seats));
  return {
    seats: Number.isFinite(seats) && seats > 0 ? Math.min(seats, 999) : ORG_ALL_ACCESS_DEFAULT_SEATS,
    startsAt: new Date(Number.isFinite(start) ? start : Date.now()).toISOString(),
    expiresAt: new Date(end).toISOString(),
  };
}

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
