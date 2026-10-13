import { NextResponse } from "next/server";
import type { OrgPremiumPlanId, OrgTeamRosterEntry } from "@/lib/organization-team-config";
import {
  ensureOrganizationTeam,
  readOrganizationTeam,
  readOrganizationTeamAdminConfig,
  writeOrganizationTeam,
} from "@/lib/server/organization-team-store";
import {
  learnerAuthRequiredResponse,
  requireLearnerMutationAuth,
  requireLearnerSessionEmail,
} from "@/lib/server/learner-session";
import {
  mergeClientRosterWithServerFields,
  organisationOwnedCourseSlugs,
  requireOrganisationOwner,
  revokeRemovedEmployees,
  syncOrganisationEnrollments,
  type OrgEnrollmentSyncResult,
} from "@/lib/server/organization-employee-accounts";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

type Body = {
  email?: string;
  companyName?: string;
  planId?: OrgPremiumPlanId;
  seatLimit?: number;
  roster?: OrgTeamRosterEntry[];
  courseAssignments?: Record<string, string[]>;
};

export async function GET(request: Request) {
  const email = requireLearnerSessionEmail(request);
  if (!email) return learnerAuthRequiredResponse();

  try {
    const adminConfig = await readOrganizationTeamAdminConfig();
    let team = await readOrganizationTeam(email);
    if (!team) {
      team = await ensureOrganizationTeam({ workEmail: email });
    }
    let ownedCourseSlugs: string[] = [];
    if (await requireOrganisationOwner(email)) {
      const synced = await syncOrganisationEnrollments(email);
      if (synced.team) team = synced.team;
      ownedCourseSlugs = [...(await organisationOwnedCourseSlugs(email))];
    }
    return NextResponse.json({ ok: true, team, adminConfig, ownedCourseSlugs }, { headers: noStoreJson });
  } catch (err) {
    console.error("[api/organization/team GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load organisation team data." },
      { status: 503, headers: noStoreJson },
    );
  }
}

/** One-time migration from browser localStorage demo data */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;
  const sessionEmail = auth.email;

  try {
    const body = (await request.json()) as Body;
    const email = sessionEmail;

    const existing = await readOrganizationTeam(email);
    if (existing?.roster.some((r) => r.invited)) {
      const adminConfig = await readOrganizationTeamAdminConfig();
      return NextResponse.json({ ok: true, team: existing, adminConfig }, { headers: noStoreJson });
    }

    const team = await ensureOrganizationTeam({
      workEmail: email,
      companyName: body.companyName,
      planId: body.planId,
      seatLimit: body.seatLimit,
      roster: body.roster
        ? mergeClientRosterWithServerFields(body.roster, existing?.roster ?? [])
        : undefined,
      courseAssignments: body.courseAssignments,
    });
    const adminConfig = await readOrganizationTeamAdminConfig();
    return NextResponse.json({ ok: true, team, adminConfig }, { headers: noStoreJson });
  } catch (err) {
    console.error("[api/organization/team POST]", err);
    return NextResponse.json(
      { ok: false, message: "Could not migrate organisation team data." },
      { status: 503, headers: noStoreJson },
    );
  }
}

export async function PUT(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;
  const sessionEmail = auth.email;

  try {
    const body = (await request.json()) as Body;
    const email = sessionEmail;

    const existing = await ensureOrganizationTeam({
      workEmail: email,
      companyName: body.companyName,
    });
    const roster = body.roster
      ? mergeClientRosterWithServerFields(body.roster, existing.roster)
      : existing.roster;
    let team = await writeOrganizationTeam({
      ...existing,
      workEmail: email,
      companyName: body.companyName ?? existing.companyName,
      planId: body.planId ?? existing.planId,
      seatLimit: body.seatLimit ?? existing.seatLimit,
      roster,
      courseAssignments: body.courseAssignments ?? existing.courseAssignments,
      updatedAt: new Date().toISOString(),
    });

    let enrollment: OrgEnrollmentSyncResult | undefined;
    let ownedCourseSlugs: string[] = [];
    if (await requireOrganisationOwner(email)) {
      await revokeRemovedEmployees(existing.roster, team.roster);
      const synced = await syncOrganisationEnrollments(email);
      if (synced.team) team = synced.team;
      enrollment = synced.result;
      ownedCourseSlugs = [...(await organisationOwnedCourseSlugs(email))];
    }
    const adminConfig = await readOrganizationTeamAdminConfig();
    return NextResponse.json(
      { ok: true, team, adminConfig, enrollment, ownedCourseSlugs },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[api/organization/team PUT]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save organisation team data." },
      { status: 503, headers: noStoreJson },
    );
  }
}
