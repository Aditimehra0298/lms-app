import { NextResponse } from "next/server";
import { clearLearnerSession } from "@/lib/server/learner-session";
import { clearAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

/** Clear learner + admin httpOnly session cookies. */
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  clearLearnerSession(res);
  await clearAdminSession(res, request);
  return res;
}
