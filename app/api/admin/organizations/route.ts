import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { describeRegistrationIdStorage } from "@/lib/registration-ids";
import {
  ensureOrganizationProfile,
  listOrganizations,
} from "@/lib/server/organization-identification";
import { ensureOrganizationTeam } from "@/lib/server/organization-team-store";
import type { OrgPremiumPlanId } from "@/lib/organization-team-config";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** List all organisations. */
export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  try {
    const organizations = await listOrganizations();
    return NextResponse.json(
      {
        ok: true,
        format: describeRegistrationIdStorage(),
        count: organizations.length,
        organizations,
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[admin/organizations GET]", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Could not load organisations. Please try again or contact your technical team.",
      },
      { status: 503 },
    );
  }
}

/** Create or update an organisation from the admin panel. */
export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  let body: {
    companyName?: string;
    workEmail?: string;
    personalEmail?: string;
    industryType?: string;
    companySize?: string;
    planId?: OrgPremiumPlanId;
    seatLimit?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const companyName = body.companyName?.trim() ?? "";
  const workEmail = body.workEmail?.trim().toLowerCase() ?? "";
  if (!companyName || !workEmail || !workEmail.includes("@")) {
    return NextResponse.json(
      { ok: false, message: "Company name and a valid work email are required." },
      { status: 400 },
    );
  }

  try {
    const organization = await ensureOrganizationProfile({
      companyName,
      workEmail,
      personalEmail: body.personalEmail?.trim() || null,
      industryType: body.industryType?.trim() || null,
      companySize: body.companySize?.trim() || null,
    });
    if (!organization) {
      return NextResponse.json({ ok: false, message: "Could not save organisation." }, { status: 400 });
    }

    const team = await ensureOrganizationTeam({
      workEmail: organization.workEmail,
      companyName: organization.companyName,
      planId: body.planId,
      seatLimit: body.seatLimit,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Organisation saved.",
        organization,
        team,
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[admin/organizations POST]", err);
    return NextResponse.json(
      { ok: false, message: "Could not create organisation. Please try again." },
      { status: 503 },
    );
  }
}
