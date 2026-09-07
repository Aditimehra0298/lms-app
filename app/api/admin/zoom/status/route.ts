import { NextResponse } from "next/server";
import { isZoomApiConfigured, zoomApiConfigHint } from "@/lib/server/zoom-client";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  return NextResponse.json({
    configured: isZoomApiConfigured(),
    hint: isZoomApiConfigured() ? null : zoomApiConfigHint(),
    autoRecordCloud: process.env.ZOOM_AUTO_RECORD_CLOUD !== "false",
  });
}
