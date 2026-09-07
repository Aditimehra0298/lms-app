import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

/** Clear the httpOnly admin session cookie and release the exclusive lock. */
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  return clearAdminSession(res, request);
}
