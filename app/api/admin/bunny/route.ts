import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import {
  bunnyConfig,
  bunnyQueueSize,
  listBunnyVideos,
  refreshProcessingBunnyVideos,
  syncAllVideosToBunny,
} from "@/lib/server/bunny-stream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const cfg = bunnyConfig();
  if (!cfg) {
    return NextResponse.json({ ok: true, configured: false, videos: {}, queue: 0 });
  }
  await refreshProcessingBunnyVideos();
  return NextResponse.json(
    {
      ok: true,
      configured: true,
      tokenAuth: Boolean(cfg.tokenKey),
      videos: await listBunnyVideos(),
      queue: bunnyQueueSize(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  if (!bunnyConfig()) {
    return NextResponse.json(
      { ok: false, message: "Bunny Stream is not configured. Add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY." },
      { status: 400 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "sync") {
    return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
  }
  const queued = await syncAllVideosToBunny({ retryErrors: true });
  return NextResponse.json({ ok: true, queued });
}
