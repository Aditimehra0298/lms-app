import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { listOrganizations } from "@/lib/server/organization-identification";
import { readAllOrganizationTeams, readOrganizationTeamAdminConfig } from "@/lib/server/organization-team-store";
import {
  getOrganizationPremiumPlanConfig,
  isOrgAllAccessActive,
  resolveSeatLimitForOrg,
  rosterEntryHasLogin,
} from "@/lib/organization-team-config";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

export type OrgDirectoryEmployee = {
  slot: number;
  name: string;
  email: string;
  position: string;
  login: "created" | "linked" | "pending";
  lastLoginAt: string | null;
  courses: { slug: string; title: string }[];
};

export type OrgDirectoryRow = {
  identificationNumber: number | null;
  companyName: string;
  workEmail: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerLastLoginAt: string | null;
  industryType: string | null;
  companySize: string | null;
  registeredAt: string | null;
  planName: string;
  seatLimit: number;
  allAccess: { seats: number; startsAt: string; expiresAt: string; active: boolean } | null;
  employees: OrgDirectoryEmployee[];
  assignedCourseCount: number;
  updatedAt: string | null;
};

/** One table-ready list: MySQL organisation + owner account + team roster and course assignments. */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const [orgs, teams, adminConfig, courses] = await Promise.all([
      listOrganizations().catch(() => []),
      readAllOrganizationTeams(),
      readOrganizationTeamAdminConfig(),
      getManagedCourses().catch(() => []),
    ]);
    const courseTitle = new Map(courses.map((c) => [c.slug.toLowerCase(), c.title]));
    const teamByEmail = new Map(teams.map((t) => [t.workEmail.toLowerCase(), t]));
    const orgByEmail = new Map(orgs.map((o) => [o.workEmail.toLowerCase(), o]));
    const allEmails = Array.from(new Set([...orgByEmail.keys(), ...teamByEmail.keys()]));

    const peopleEmails = new Set<string>(allEmails);
    for (const team of teams) {
      for (const row of team.roster) if (row.email.trim()) peopleEmails.add(row.email.trim().toLowerCase());
    }
    const users = await prisma.lmsUser
      .findMany({
        where: { email: { in: Array.from(peopleEmails) } },
        select: { email: true, name: true, phone: true, lastLoginAt: true, createdAt: true },
      })
      .catch(() => []);
    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const rows: OrgDirectoryRow[] = allEmails.map((email) => {
      const org = orgByEmail.get(email);
      const team = teamByEmail.get(email);
      const owner = userByEmail.get(email);
      const assignments = team?.courseAssignments ?? {};

      const employees: OrgDirectoryEmployee[] = (team?.roster ?? [])
        .filter((r) => r.name.trim() || r.email.trim())
        .map((r) => {
          const slugs = new Set<string>(r.orgEnrolledSlugs ?? []);
          for (const [slug, ids] of Object.entries(assignments)) if (ids.includes(r.id)) slugs.add(slug);
          const user = userByEmail.get(r.email.trim().toLowerCase());
          return {
            slot: r.slot,
            name: r.name.trim(),
            email: r.email.trim(),
            position: r.position.trim(),
            login: r.loginCreatedAt ? "created" : rosterEntryHasLogin(r) ? "linked" : "pending",
            lastLoginAt: user?.lastLoginAt?.toISOString() ?? null,
            courses: Array.from(slugs).map((slug) => ({ slug, title: courseTitle.get(slug.toLowerCase()) ?? slug })),
          };
        });

      const planId = team?.planId ?? adminConfig.defaultPlanId;
      return {
        identificationNumber: org?.identificationNumber ?? null,
        companyName: org?.companyName || team?.companyName || email,
        workEmail: email,
        ownerName: owner?.name ?? null,
        ownerPhone: owner?.phone ?? null,
        ownerLastLoginAt: owner?.lastLoginAt?.toISOString() ?? null,
        industryType: org?.industryType ?? null,
        companySize: org?.companySize ?? null,
        registeredAt: org?.registrationMonthYear ?? owner?.createdAt?.toISOString().slice(0, 10) ?? null,
        planName: getOrganizationPremiumPlanConfig(planId, adminConfig).name,
        seatLimit: team?.allAccess?.seats ?? resolveSeatLimitForOrg(planId, team?.seatLimit, adminConfig),
        allAccess: team?.allAccess ? { ...team.allAccess, active: isOrgAllAccessActive(team) } : null,
        employees,
        assignedCourseCount: Object.values(assignments).filter((ids) => ids.length > 0).length,
        updatedAt: team?.updatedAt ?? null,
      };
    });

    rows.sort(
      (a, b) =>
        (a.identificationNumber ?? Number.MAX_SAFE_INTEGER) - (b.identificationNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.companyName.localeCompare(b.companyName),
    );
    return NextResponse.json({ ok: true, organizations: rows }, { headers: noStoreJson });
  } catch (err) {
    console.error("[admin/organizations/directory GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load the organisation directory." },
      { status: 503, headers: noStoreJson },
    );
  }
}
