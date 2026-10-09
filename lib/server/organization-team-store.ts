import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultOrganizationTeamAdminConfig,
  emptyRosterSlot,
  isDemoRosterEntry,
  mergeOrganizationTeamAdminConfig,
  stripDemoTeamData,
  resolveSeatLimitForOrg,
  type OrgPremiumPlanId,
  type OrganizationTeamAdminConfig,
  type OrganizationTeamRecord,
  type OrgTeamRosterEntry,
} from "@/lib/organization-team-config";
import { readAdminContent } from "@/lib/server/content-store";

const teamsFilePath = path.join(process.cwd(), "data", "organization-teams.json");

type TeamsFile = {
  teams: Record<string, OrganizationTeamRecord>;
};

async function ensureTeamsFile(): Promise<void> {
  const dir = path.dirname(teamsFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(teamsFilePath);
  } catch {
    await fs.writeFile(teamsFilePath, JSON.stringify({ teams: {} } satisfies TeamsFile, null, 2), "utf8");
  }
}

async function readTeamsFile(): Promise<TeamsFile> {
  await ensureTeamsFile();
  try {
    const raw = await fs.readFile(teamsFilePath, "utf8");
    const parsed = JSON.parse(raw) as TeamsFile;
    return parsed?.teams && typeof parsed.teams === "object" ? parsed : { teams: {} };
  } catch {
    return { teams: {} };
  }
}

async function writeTeamsFile(data: TeamsFile): Promise<void> {
  await ensureTeamsFile();
  await fs.writeFile(teamsFilePath, JSON.stringify(data, null, 2), "utf8");
}

export async function readOrganizationTeamAdminConfig(): Promise<OrganizationTeamAdminConfig> {
  const content = await readAdminContent();
  return mergeOrganizationTeamAdminConfig(content.organizationTeam);
}

export function buildEmptyOrgRoster(seatTotal: number): OrgTeamRosterEntry[] {
  return Array.from({ length: Math.max(1, seatTotal) }, (_, i) => emptyRosterSlot(i + 1));
}

export function normalizeOrganizationTeamRecord(
  input: Partial<OrganizationTeamRecord> & { workEmail: string },
  adminConfig: OrganizationTeamAdminConfig,
): OrganizationTeamRecord {
  const workEmail = input.workEmail.trim().toLowerCase();
  const planId = (input.planId ?? adminConfig.defaultPlanId) as OrgPremiumPlanId;
  const seatTotal = resolveSeatLimitForOrg(planId, input.seatLimit, adminConfig);
  const base = buildEmptyOrgRoster(seatTotal);
  const incoming = Array.isArray(input.roster) ? input.roster : [];

  for (const row of incoming) {
    const idx = row.slot - 1;
    if (idx < 0 || idx >= base.length || isDemoRosterEntry(row)) continue;
    base[idx] = {
      ...base[idx],
      ...row,
      slot: row.slot,
      invited: Boolean(row.name?.trim() && row.email?.trim()),
    };
  }

  const rosterIds = new Set(base.map((r) => r.id));
  const courseAssignments: Record<string, string[]> = {};
  if (input.courseAssignments && typeof input.courseAssignments === "object") {
    for (const [slug, ids] of Object.entries(input.courseAssignments)) {
      if (!slug || !Array.isArray(ids)) continue;
      courseAssignments[slug] = [...new Set(ids.filter((id) => id && rosterIds.has(id)))];
    }
  }

  return {
    workEmail,
    companyName: input.companyName?.trim() || undefined,
    planId,
    seatLimit: seatTotal,
    roster: base,
    courseAssignments,
    updatedAt: new Date().toISOString(),
  };
}

export async function readOrganizationTeam(
  workEmail: string,
): Promise<OrganizationTeamRecord | null> {
  const email = workEmail.trim().toLowerCase();
  if (!email) return null;
  const file = await readTeamsFile();
  const team = file.teams[email];
  return team ? stripDemoTeamData(team) : null;
}

export async function readAllOrganizationTeams(): Promise<OrganizationTeamRecord[]> {
  const file = await readTeamsFile();
  return Object.values(file.teams)
    .map(stripDemoTeamData)
    .sort((a, b) => a.workEmail.localeCompare(b.workEmail));
}

export async function ensureOrganizationTeam(input: {
  workEmail: string;
  companyName?: string | null;
  planId?: OrgPremiumPlanId;
  seatLimit?: number;
  roster?: OrgTeamRosterEntry[];
  courseAssignments?: Record<string, string[]>;
}): Promise<OrganizationTeamRecord> {
  const adminConfig = await readOrganizationTeamAdminConfig();
  const email = input.workEmail.trim().toLowerCase();
  const existing = await readOrganizationTeam(email);

  const merged = normalizeOrganizationTeamRecord(
    {
      ...existing,
      workEmail: email,
      companyName: input.companyName ?? existing?.companyName,
      planId: input.planId ?? existing?.planId ?? adminConfig.defaultPlanId,
      seatLimit: input.seatLimit ?? existing?.seatLimit,
      roster: input.roster ?? existing?.roster,
      courseAssignments: input.courseAssignments ?? existing?.courseAssignments,
    },
    adminConfig,
  );

  const file = await readTeamsFile();
  file.teams[email] = merged;
  await writeTeamsFile(file);
  return merged;
}

export async function writeOrganizationTeam(
  record: OrganizationTeamRecord,
): Promise<OrganizationTeamRecord> {
  const adminConfig = await readOrganizationTeamAdminConfig();
  const normalized = normalizeOrganizationTeamRecord(record, adminConfig);
  const file = await readTeamsFile();
  file.teams[normalized.workEmail] = normalized;
  await writeTeamsFile(file);
  return normalized;
}

export { defaultOrganizationTeamAdminConfig };
