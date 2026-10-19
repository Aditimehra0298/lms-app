import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import {
  buildAnalyticsDashboard,
  type AnalyticsAudience,
} from "@/lib/server/admin-analytics-dashboard";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function parseAudience(raw: string | null): AnalyticsAudience | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "individual" || v === "learner" || v === "personal") return "individual";
  if (v === "organisation" || v === "organization" || v === "org") return "organisation";
  return null;
}

/**
 * GET /api/admin/analytics/command-center?audience=individual|organisation
 * Full Figma-style analytics dashboard for Individual and Organization.
 */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const audience = parseAudience(new URL(request.url).searchParams.get("audience"));
  if (!audience) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pass audience=individual or audience=organisation.",
      },
      { status: 400, headers: noStore },
    );
  }

  try {
    const payload = await buildAnalyticsDashboard(audience);
    return NextResponse.json(payload, { headers: noStore });
  } catch (err) {
    console.error("[api/admin/analytics/command-center]", err);
    return NextResponse.json(
      { ok: false, message: "Could not load analytics dashboard." },
      { status: 503, headers: noStore },
    );
  }
}
