import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import type { OrgPremiumPlanId, OrgTeamRosterEntry } from "@/lib/organization-team-config";
import {
  ensureOrganizationTeam,
  readOrganizationTeam,
  readOrganizationTeamAdminConfig,
  writeOrganizationTeam,
} from "@/lib/server/organization-team-store";

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
  const email = normalizeLearnerEmail(new URL(request.url).searchParams.get("email")?.trim() ?? "");
  if (!email) {
    return NextResponse.json({ ok: false, message: "email query required" }, { status: 400 });
  }

  try {
    const adminConfig = await readOrganizationTeamAdminConfig();
    let team = await readOrganizationTeam(email);
    if (!team) {
      team = await ensureOrganizationTeam({ workEmail: email });
    }
    return NextResponse.json({ ok: true, team, adminConfig }, { headers: noStoreJson });
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
  try {
    const body = (await request.json()) as Body;
    const email = normalizeLearnerEmail(body.email?.trim() ?? "");
    if (!email) {
      return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
    }

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
      roster: body.roster,
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
  try {
    const body = (await request.json()) as Body;
    const email = normalizeLearnerEmail(body.email?.trim() ?? "");
    if (!email) {
      return NextResponse.json({ ok: false, message: "email required" }, { status: 400 });
    }

    const existing = await ensureOrganizationTeam({ workEmail: email, companyName: body.companyName });
    const team = await writeOrganizationTeam({
      ...existing,
      workEmail: email,
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
    console.error("[api/organization/team PUT]", err);
    return NextResponse.json(
      { ok: false, message: "Could not save organisation team data." },
      { status: 503, headers: noStoreJson },
    );
  }
}
