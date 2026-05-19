import { NextResponse } from "next/server";
import { isZoomApiConfigured, zoomApiConfigHint } from "@/lib/server/zoom-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: isZoomApiConfigured(),
    hint: isZoomApiConfigured() ? null : zoomApiConfigHint(),
    autoRecordCloud: process.env.ZOOM_AUTO_RECORD_CLOUD !== "false",
  });
}
