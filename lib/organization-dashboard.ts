import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import {
  getActiveOrgPremiumPlan,
  orgPremiumPlanLearningRule,
  readOrgPremiumPlanState,
  resolveOrgSeatLimit,
} from "@/lib/organization-premium-plans";
import { isDemoRosterEntry } from "@/lib/organization-team-config";
import { getCachedOrganizationTeamRecord } from "@/lib/organization-team-sync-client";

/** Helpers for organisation learner dashboard (seats, plan labels). */

/** Fixed locale so server HTML matches client (avoids hydration mismatch). */
export function formatDashboardDate(now: Date): string {
  return now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOrganizationContextLine(input: {
  industryType?: string | null;
  countryName?: string | null;
  companySize?: string | null;
}): string | null {
  const parts = [
    input.industryType?.trim(),
    input.countryName?.trim(),
    input.companySize?.trim() ? `${input.companySize.trim()} employees` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type OrgEmployeeProgress = {
  id: string;
  name: string;
  progressPercent: number;
  avatarUrl?: string;
};

export type OrgComplianceRow = {
  id: string;
  label: string;
  percent: number;
  tone: "rose" | "sky" | "emerald" | "violet";
};

export type OrgPlanDetailField = {
  label: string;
  value: string;
};

/** Plan details as professional prose for the subscription card. */
export function formatPlanDetailsParagraph(details: OrgPlanDetailField[]): string {
  const m = Object.fromEntries(details.map((d) => [d.label, d.value]));
  const validUntil = m["Valid until"];
  const seats = m["Seats"] ?? "—";
  const teamSize = m["Team size"] ?? "your team";
  const billing = (m["Billing"] ?? "Annual").toLowerCase();
  const access = (m["Course access"] ?? "full catalog access").toLowerCase();
  const certificates = (m["Certificates"] ?? "certificate tracking").toLowerCase();
  const support = (m["Support"] ?? "standard support").toLowerCase();
  const renewal = m["Renewal"];

  return (
    (validUntil ? `Your plan is valid until ${validUntil}. ` : "") +
    `Seat usage is ${seats}, covering a ${teamSize.toLowerCase()}, with ${billing} billing. ` +
    `Your organisation includes ${access}, ${certificates}, and ${support}.` +
    (renewal ? ` ${renewal.endsWith(".") ? renewal : `${renewal}.`}` : "")
  );
}

export type OrganizationDashboardSnapshot = {
  companyName: string;
  planName: string;
  planTier: string;
  planValidUntil: string;
  planDetails: OrgPlanDetailField[];
  seatsUsed: number;
  seatsTotal: number;
  activeLearners: number;
  activeLearnersDelta: number;
  /** null until employees have real completion data. */
  complianceScore: number | null;
  complianceScoreDelta: number;
  complianceEarned: number;
  complianceEarnedDelta: number;
  employees: OrgEmployeeProgress[];
  complianceRows: OrgComplianceRow[];
};

/** Parse admin registration company size into a seat cap (demo until billing API). */
export function seatsTotalFromCompanySize(companySize?: string | null): number {
  const raw = companySize?.trim().toLowerCase() ?? "";
  if (!raw) return 20;
  if (raw.includes("500") || raw.includes("1000")) return 100;
  if (raw.includes("201") || raw.includes("500")) return 50;
  if (raw.includes("51") || raw.includes("200")) return 30;
  if (raw.includes("11") || raw.includes("50")) return 20;
  if (raw.includes("1-10") || raw.includes("1–10")) return 10;
  const nums = raw.match(/\d+/g)?.map((n) => Number(n)) ?? [];
  if (nums.length > 0) return Math.max(...nums);
  return 20;
}

export function formatOrgEmployeeUserId(employeeId: string): string {
  const digits = employeeId.replace(/\D/g, "") || employeeId;
  return `EMP-${digits.padStart(4, "0")}`;
}

export function buildOrganizationDashboardSnapshot(input: {
  companyName?: string | null;
  companySize?: string | null;
  certificateCount?: number;
}): OrganizationDashboardSnapshot {
  const planState =
    typeof window !== "undefined" ? readOrgPremiumPlanState() : undefined;
  const activePlan = getActiveOrgPremiumPlan(planState);
  const seatsTotal =
    typeof window !== "undefined"
      ? resolveOrgSeatLimit(planState)
      : seatsTotalFromCompanySize(input.companySize);
  const invited =
    typeof window !== "undefined"
      ? (getCachedOrganizationTeamRecord()?.roster.filter((r) => r.invited && !isDemoRosterEntry(r)) ?? [])
      : [];

  const companyLabel = input.companyName?.trim() || "Your Organisation";
  const sizeLabel = input.companySize?.trim() || `${seatsTotal} employees`;

  return {
    companyName: companyLabel,
    planName: activePlan.name,
    planTier: activePlan.billingLabel,
    planValidUntil: "",
    planDetails: [
      { label: "Seats", value: `${seatsTotal} learner seats` },
      { label: "Team size", value: sizeLabel },
      { label: "Billing", value: activePlan.billingLabel },
      { label: "Course access", value: "Any course in catalog" },
      { label: "Learning rule", value: orgPremiumPlanLearningRule(activePlan) },
      { label: "Certificates", value: "Team tracking enabled" },
      { label: "Support", value: "Priority email" },
    ],
    seatsUsed: invited.length,
    seatsTotal,
    activeLearners: invited.length,
    activeLearnersDelta: 0,
    complianceScore: null,
    complianceScoreDelta: 0,
    complianceEarned: input.certificateCount ?? 0,
    complianceEarnedDelta: 0,
    employees: invited.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatarUrl,
      progressPercent: 0,
    })),
    complianceRows: [],
  };
}
