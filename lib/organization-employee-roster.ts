import {
  defaultOrgEmployeeProgress,
  formatOrgEmployeeUserId,
  seatsTotalFromCompanySize,
} from "@/lib/organization-dashboard";
import { resolveOrgSeatLimit } from "@/lib/organization-premium-plans";
import type { OrgTeamRosterEntry } from "@/lib/organization-team-config";
import {
  getCachedOrganizationTeamRecord,
  ORG_TEAM_DATA_EVENT,
  saveOrganizationTeamToServer,
} from "@/lib/organization-team-sync-client";

export { formatOrgEmployeeUserId };

export const ORG_EMPLOYEE_ROSTER_EVENT = ORG_TEAM_DATA_EVENT;

export type OrgEmployeeRosterEntry = OrgTeamRosterEntry;

function seedFromDemo(slot: number, seatTotal: number): Partial<OrgEmployeeRosterEntry> {
  const demo = defaultOrgEmployeeProgress();
  const emp = demo[slot - 1];
  if (!emp || slot > seatTotal) return {};
  return {
    id: emp.id,
    name: emp.name,
    email: `${emp.name.toLowerCase().replace(/\s+/g, ".")}@team.demo`,
    position: slot === 1 ? "Operations Lead" : slot === 2 ? "Quality Manager" : "Team Member",
    avatarUrl: emp.avatarUrl,
    invited: true,
  };
}

export function buildEmptyRoster(seatTotal: number): OrgEmployeeRosterEntry[] {
  const safe = Math.max(1, seatTotal);
  return Array.from({ length: safe }, (_, i) => {
    const slot = i + 1;
    const seed = seedFromDemo(slot, safe);
    return {
      slot,
      id: seed.id ?? `slot-${slot}`,
      name: seed.name ?? "",
      email: seed.email ?? "",
      position: seed.position ?? "",
      avatarUrl: seed.avatarUrl,
      invited: Boolean(seed.invited && seed.name),
    };
  });
}

export function readOrgEmployeeRoster(seatTotal: number): OrgEmployeeRosterEntry[] {
  const cached = getCachedOrganizationTeamRecord();
  if (cached?.roster?.length) {
    const expected = Math.max(1, seatTotal);
    if (cached.roster.length === expected) return cached.roster;
    const base = buildEmptyRoster(expected);
    for (const row of cached.roster) {
      const idx = row.slot - 1;
      if (idx < 0 || idx >= base.length) continue;
      base[idx] = { ...base[idx], ...row, invited: Boolean(row.name?.trim() && row.email?.trim()) };
    }
    return base;
  }
  return buildEmptyRoster(Math.max(1, seatTotal));
}

export function writeOrgEmployeeRoster(seatTotal: number, rows: OrgEmployeeRosterEntry[]) {
  void saveOrganizationTeamToServer({ roster: rows, seatLimit: seatTotal });
}

export function updateOrgEmployeeRosterEntry(
  seatTotal: number,
  slot: number,
  patch: Partial<Pick<OrgEmployeeRosterEntry, "name" | "email" | "position" | "avatarUrl">>,
): OrgEmployeeRosterEntry[] {
  const rows = readOrgEmployeeRoster(seatTotal);
  const idx = rows.findIndex((r) => r.slot === slot);
  if (idx < 0) return rows;
  const next = [...rows];
  const name = patch.name !== undefined ? patch.name.trim() : next[idx].name;
  const email = patch.email !== undefined ? patch.email.trim() : next[idx].email;
  const willInvite = Boolean(name && email);
  if (willInvite && !next[idx].invited && !canInviteMoreEmployees(next, seatTotal, slot)) {
    return next;
  }
  next[idx] = {
    ...next[idx],
    ...patch,
    name,
    email,
    position: patch.position !== undefined ? patch.position.trim() : next[idx].position,
    invited: willInvite,
  };
  writeOrgEmployeeRoster(seatTotal, next);
  return next;
}

export function rosterSeatTotal(companySize?: string | null): number {
  if (typeof window !== "undefined") {
    return resolveOrgSeatLimit();
  }
  return seatsTotalFromCompanySize(companySize);
}

export function canInviteMoreEmployees(
  rows: OrgEmployeeRosterEntry[],
  seatTotal: number,
  targetSlot: number,
): boolean {
  const invited = countInvitedEmployees(rows);
  const row = rows.find((r) => r.slot === targetSlot);
  if (!row) return false;
  if (row.invited) return true;
  return invited < seatTotal;
}

export function countInvitedEmployees(rows: OrgEmployeeRosterEntry[]): number {
  return rows.filter((r) => r.invited).length;
}

export function rosterDisplayId(entry: OrgEmployeeRosterEntry): string {
  return entry.invited ? formatOrgEmployeeUserId(entry.id) : `Seat ${entry.slot}`;
}
