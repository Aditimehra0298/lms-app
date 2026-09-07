import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import type { OrgPremiumPlanId } from "@/lib/organization-team-config";
import {
  ensureOrganizationTeam,
  readAllOrganizationTeams,
  readOrganizationTeam,
  readOrganizationTeamAdminConfig,
  writeOrganizationTeam,
} from "@/lib/server/organization-team-store";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

type Body = {
  workEmail?: string;
  companyName?: string;
  planId?: OrgPremiumPlanId;
  seatLimit?: number;
  roster?: Awaited<ReturnType<typeof readOrganizationTeam>> extends infer T
    ? T extends { roster: infer R }
      ? R
      : never
    : never;
  courseAssignments?: Record<string, string[]>;
};

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const workEmail = new URL(request.url).searchParams.get("workEmail")?.trim().toLowerCase();
    const adminConfig = await readOrganizationTeamAdminConfig();

    if (workEmail) {
      let team = await readOrganizationTeam(workEmail);
      if (!team) team = await ensureOrganizationTeam({ workEmail });
      return NextResponse.json({ ok: true, team, adminConfig }, { headers: noStoreJson });
    }

    const teams = await readAllOrganizationTeams();
    return NextResponse.json({ ok: true, teams, adminConfig }, { headers: noStoreJson });
  } catch (err) {
    console.error("[admin/organization-teams GET]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load organisation teams." },
      { status: 503, headers: noStoreJson },
    );
  }
}

export async function PUT(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Body;
    const workEmail = body.workEmail?.trim().toLowerCase();
    if (!workEmail) {
      return NextResponse.json({ ok: false, message: "workEmail required" }, { status: 400 });
    }

    const existing = await ensureOrganizationTeam({
      workEmail,
      companyName: body.companyName,
    });

    const team = await writeOrganizationTeam({
      ...existing,
      workEmail,
      companyName: body.companyName ?? existing.companyName,
      planId: body.planId ?? existing.planId,
      seatLimit: body.seatLimit ?? existing.seatLimit,
      roster: body.roster ?? existing.roster,
      courseAssignments: body.courseAssignments ?? existing.courseAssignments,
      updatedAt: new Date().toISOString(),
    });

    const adminConfig = await readOrganizationTeamAdminConfig();
    return NextResponse.json({ ok: true, team, adminConfig }, { headers: noStoreJson });
  } catch (err) {
    console.error("[admin/organization-teams PUT]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save organisation team." },
      { status: 503, headers: noStoreJson },
    );
  }
}
