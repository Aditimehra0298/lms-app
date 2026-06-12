import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import {
  getActiveOrgPremiumPlan,
  orgPremiumPlanLearningRule,
  readOrgPremiumPlanState,
  resolveOrgSeatLimit,
} from "@/lib/organization-premium-plans";
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
  const validUntil = m["Valid until"] ?? "—";
  const seats = m["Seats"] ?? "—";
  const teamSize = m["Team size"] ?? "your team";
  const billing = (m["Billing"] ?? "Annual").toLowerCase();
  const access = (m["Course access"] ?? "full catalog access").toLowerCase();
  const certificates = (m["Certificates"] ?? "certificate tracking").toLowerCase();
  const support = (m["Support"] ?? "standard support").toLowerCase();
  const renewal = m["Renewal"] ?? "Renewal details are available in your plan settings.";

  return (
    `Your Professional Plan is valid until ${validUntil}. Seat usage is ${seats}, covering a ${teamSize.toLowerCase()}, with ${billing} billing. ` +
    `Your organisation includes ${access}, ${certificates}, and ${support}. ${renewal.endsWith(".") ? renewal : `${renewal}.`}`
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
  complianceScore: number;
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

export function demoOrgEmployeeEmail(employee: Pick<OrgEmployeeProgress, "name" | "id">): string {
  const local = employee.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${local || `user${employee.id}`}@team.demo`;
}

/** Starter employee list — replace with API when org roster is wired. */
export function defaultOrgEmployeeProgress(): OrgEmployeeProgress[] {
  return [
    {
      id: "1",
      name: "John Smith",
      progressPercent: 100,
      avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      progressPercent: 100,
      avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "3",
      name: "Michael Brown",
      progressPercent: 100,
      avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
    },
    {
      id: "4",
      name: "Emily Davis",
      progressPercent: 68,
      avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      id: "5",
      name: "David Wilson",
      progressPercent: 82,
      avatarUrl: "https://randomuser.me/api/portraits/men/41.jpg",
    },
  ];
}

export function defaultOrgComplianceRows(): OrgComplianceRow[] {
  return [
    { id: "food", label: "Food Safety", percent: 92, tone: "rose" },
    { id: "cyber", label: "Cyber Security", percent: 75, tone: "sky" },
    { id: "esg", label: "ESG Compliance", percent: 81, tone: "emerald" },
    { id: "iso", label: "ISO 27001", percent: 67, tone: "violet" },
  ];
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
  const invitedCount =
    typeof window !== "undefined"
      ? (getCachedOrganizationTeamRecord()?.roster.filter((r) => r.invited).length ?? 0)
      : 0;
  const complianceEarned = input.certificateCount ?? 35;
  const activeLearners = invitedCount > 0 ? invitedCount : Math.min(seatsTotal, Math.max(1, Math.round(seatsTotal * 0.7)));

  const companyLabel = input.companyName?.trim() || "Your Organisation";
  const sizeLabel = input.companySize?.trim() || `${seatsTotal} employees`;

  return {
    companyName: companyLabel,
    planName: activePlan.name,
    planTier: activePlan.billingLabel,
    planValidUntil: "12 May 2026",
    planDetails: [
      { label: "Valid until", value: "12 May 2026" },
      { label: "Seats", value: `${seatsTotal} learner seats` },
      { label: "Team size", value: sizeLabel },
      { label: "Billing", value: activePlan.billingLabel },
      { label: "Course access", value: "Any course in catalog" },
      { label: "Learning rule", value: orgPremiumPlanLearningRule(activePlan) },
      { label: "Certificates", value: "Team tracking enabled" },
      { label: "Support", value: "Priority email" },
      { label: "Renewal", value: "Auto-renew · 12 May 2026" },
    ],
    seatsUsed: invitedCount > 0 ? invitedCount : activeLearners,
    seatsTotal,
    activeLearners,
    activeLearnersDelta: 2,
    complianceScore: 82,
    complianceScoreDelta: 6,
    complianceEarned,
    complianceEarnedDelta: 5,
    employees: defaultOrgEmployeeProgress(),
    complianceRows: defaultOrgComplianceRows(),
  };
}
