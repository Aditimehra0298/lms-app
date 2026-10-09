import { formatOrgEmployeeUserId, seatsTotalFromCompanySize } from "@/lib/organization-dashboard";
import { resolveOrgSeatLimit } from "@/lib/organization-premium-plans";
import { emptyRosterSlot, isDemoRosterEntry, type OrgTeamRosterEntry } from "@/lib/organization-team-config";
import {
  getCachedOrganizationTeamRecord,
  ORG_TEAM_DATA_EVENT,
  saveOrganizationTeamToServer,
} from "@/lib/organization-team-sync-client";

export { formatOrgEmployeeUserId };

export const ORG_EMPLOYEE_ROSTER_EVENT = ORG_TEAM_DATA_EVENT;

export type OrgEmployeeRosterEntry = OrgTeamRosterEntry;

export function buildEmptyRoster(seatTotal: number): OrgEmployeeRosterEntry[] {
  return Array.from({ length: Math.max(1, seatTotal) }, (_, i) => emptyRosterSlot(i + 1));
}

export function readOrgEmployeeRoster(seatTotal: number): OrgEmployeeRosterEntry[] {
  const cached = getCachedOrganizationTeamRecord();
  if (cached?.roster?.length) {
    const expected = Math.max(1, seatTotal);
    const roster = cached.roster.map((r) => (isDemoRosterEntry(r) ? emptyRosterSlot(r.slot) : r));
    if (roster.length === expected) return roster;
    const base = buildEmptyRoster(expected);
    for (const row of roster) {
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
