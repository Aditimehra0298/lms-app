import { NextResponse } from "next/server";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

/** Published tutor-led programs for marketing pages and catalog links. */
export async function GET() {
  const programs = await getPublishedTutorLedPrograms();
  return NextResponse.json(
    { programs },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
