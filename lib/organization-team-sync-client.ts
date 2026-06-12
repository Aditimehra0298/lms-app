import { getLearnerEmail } from "@/lib/learner-session-client";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { readJsonResponse } from "@/lib/safe-json";
import {
  mergeOrganizationTeamAdminConfig,
  type OrganizationTeamAdminConfig,
  type OrganizationTeamRecord,
  type OrgPremiumPlanId,
  type OrgTeamRosterEntry,
} from "@/lib/organization-team-config";

export const ORG_TEAM_DATA_EVENT = "sft_org_team_data_updated";
export const ORG_PREMIUM_PLAN_EVENT = "sft_org_premium_plan_updated";

const LEGACY_PLAN_KEY = "sft_org_premium_plan";
const LEGACY_ROSTER_KEY = "sft_org_employee_roster";
const LEGACY_ASSIGNMENTS_KEY = "sft_org_course_assignments";

let cachedRecord: OrganizationTeamRecord | null = null;
let cachedAdminConfig: OrganizationTeamAdminConfig = mergeOrganizationTeamAdminConfig();

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ORG_TEAM_DATA_EVENT));
  window.dispatchEvent(new Event(ORG_PREMIUM_PLAN_EVENT));
}

export function setOrganizationTeamAdminConfig(config?: Partial<OrganizationTeamAdminConfig> | null) {
  cachedAdminConfig = mergeOrganizationTeamAdminConfig(config);
  emit();
}

export function getOrganizationTeamAdminConfig(): OrganizationTeamAdminConfig {
  return cachedAdminConfig;
}

export function getCachedOrganizationTeamRecord(): OrganizationTeamRecord | null {
  return cachedRecord;
}

function readLegacyRoster(seatTotal: number): OrgTeamRosterEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_ROSTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: OrgTeamRosterEntry[] };
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

function readLegacyAssignments(): Record<string, string[]> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_ASSIGNMENTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readLegacyPlan(): { planId?: OrgPremiumPlanId; seatLimit?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { planId?: OrgPremiumPlanId; seatLimit?: number };
  } catch {
    return null;
  }
}

function mirrorToLegacyStorage(record: OrganizationTeamRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LEGACY_PLAN_KEY,
    JSON.stringify({ planId: record.planId, seatLimit: record.seatLimit }),
  );
  window.localStorage.setItem(
    LEGACY_ROSTER_KEY,
    JSON.stringify({ seatTotal: record.seatLimit, rows: record.roster, updatedAt: record.updatedAt }),
  );
  window.localStorage.setItem(LEGACY_ASSIGNMENTS_KEY, JSON.stringify(record.courseAssignments));
}

/** Pull organisation team roster, plan, and assignments from server (admin-controlled store). */
export async function syncOrganizationTeamFromServer(
  learnerEmail?: string,
): Promise<{ ok: boolean; record?: OrganizationTeamRecord; message?: string }> {
  const email = normalizeLearnerEmail(learnerEmail ?? getLearnerEmail() ?? "");
  if (!email) return { ok: false, message: "Not signed in" };

  try {
    const legacyPlan = readLegacyPlan();
    const legacyRoster = readLegacyRoster(legacyPlan?.seatLimit ?? 20);
    const legacyAssignments = readLegacyAssignments();
    const hasLegacy =
      Boolean(legacyRoster?.length) ||
      Boolean(legacyAssignments && Object.keys(legacyAssignments).length) ||
      Boolean(legacyPlan?.planId);

    const res = await fetch(
      `/api/organization/team?email=${encodeURIComponent(email)}${
        hasLegacy ? "&migrateLegacy=1" : ""
      }`,
      {
        cache: "no-store",
        method: hasLegacy ? "POST" : "GET",
        headers: hasLegacy ? { "Content-Type": "application/json" } : undefined,
        body: hasLegacy
          ? JSON.stringify({
              email,
              planId: legacyPlan?.planId,
              seatLimit: legacyPlan?.seatLimit,
              roster: legacyRoster ?? undefined,
              courseAssignments: legacyAssignments ?? undefined,
            })
          : undefined,
      },
    );

    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      team?: OrganizationTeamRecord;
      adminConfig?: OrganizationTeamAdminConfig;
      message?: string;
    });

    if (!res.ok || !data.ok || !data.team) {
      return { ok: false, message: data.message ?? "Could not load organisation team data" };
    }

    if (data.adminConfig) {
      cachedAdminConfig = mergeOrganizationTeamAdminConfig(data.adminConfig);
    }

    cachedRecord = data.team;
    mirrorToLegacyStorage(data.team);
    emit();
    return { ok: true, record: data.team };
  } catch {
    return { ok: false, message: "Network error loading organisation team" };
  }
}

export async function saveOrganizationTeamToServer(patch: {
  email?: string;
  planId?: OrgPremiumPlanId;
  seatLimit?: number;
  roster?: OrgTeamRosterEntry[];
  courseAssignments?: Record<string, string[]>;
}): Promise<{ ok: boolean; record?: OrganizationTeamRecord; message?: string }> {
  const email = normalizeLearnerEmail(patch.email ?? getLearnerEmail() ?? "");
  if (!email) return { ok: false, message: "Not signed in" };

  try {
    const res = await fetch("/api/organization/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...patch }),
    });
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      team?: OrganizationTeamRecord;
      adminConfig?: OrganizationTeamAdminConfig;
      message?: string;
    });
    if (!res.ok || !data.ok || !data.team) {
      return { ok: false, message: data.message ?? "Save failed" };
    }
    if (data.adminConfig) {
      cachedAdminConfig = mergeOrganizationTeamAdminConfig(data.adminConfig);
    }
    cachedRecord = data.team;
    mirrorToLegacyStorage(data.team);
    emit();
    return { ok: true, record: data.team };
  } catch {
    return { ok: false, message: "Network error saving organisation team" };
  }
}
