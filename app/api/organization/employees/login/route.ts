import { NextResponse } from "next/server";
import { requireLearnerMutationAuth } from "@/lib/server/learner-session";
import {
  createEmployeeLogin,
  organisationOwnedCourseSlugs,
  requireOrganisationOwner,
} from "@/lib/server/organization-employee-accounts";
import { readOrganizationTeamAdminConfig } from "@/lib/server/organization-team-store";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** POST { slot, password } — organisation creates / resets an employee's learner login. */
export async function POST(request: Request) {
  const auth = requireLearnerMutationAuth(request);
  if ("response" in auth) return auth.response;

  const owner = await requireOrganisationOwner(auth.email);
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Only organisation accounts can create employee logins." },
      { status: 403, headers: noStoreJson },
    );
  }

  let body: { slot?: number; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStoreJson });
  }
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 1) {
    return NextResponse.json({ ok: false, message: "Seat number is required." }, { status: 400, headers: noStoreJson });
  }

  try {
    const outcome = await createEmployeeLogin({ owner, slot, password: body.password });
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, message: outcome.message }, { status: outcome.status, headers: noStoreJson });
    }
    const [adminConfig, owned] = await Promise.all([
      readOrganizationTeamAdminConfig(),
      organisationOwnedCourseSlugs(owner.email),
    ]);
    const messages = {
      created: "Login created",
      "password-reset": "Password updated",
      linked: "This email already had an account — linked to your team (their own password is unchanged)",
    } as const;
    return NextResponse.json(
      {
        ok: true,
        status: outcome.status,
        emailSent: outcome.emailSent,
        message: `${messages[outcome.status]}${outcome.emailSent ? " and login details emailed." : ". Email could not be sent — share the details yourself."}`,
        team: outcome.team,
        adminConfig,
        ownedCourseSlugs: [...owned],
      },
      { headers: noStoreJson },
    );
  } catch (err) {
    console.error("[api/organization/employees/login]", err);
    return NextResponse.json(
      { ok: false, message: "Could not create the employee login." },
      { status: 503, headers: noStoreJson },
    );
  }
}
