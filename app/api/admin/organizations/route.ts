import { NextResponse } from "next/server";
import { describeRegistrationIdStorage } from "@/lib/registration-ids";
import { listOrganizations } from "@/lib/server/organization-identification";

export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, max-age=0" };

/** List all rows in MySQL table `lms_organization` (IDs from 101). */
export async function GET() {
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
    console.error("[admin/organizations]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Could not load organisations. Run npm run db:push and npm run db:generate, then restart the dev server.",
      },
      { status: 503 },
    );
  }
}
