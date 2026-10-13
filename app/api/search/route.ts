import { NextResponse } from "next/server";
import { searchSite } from "@/lib/server/site-search";

export const dynamic = "force-dynamic";

/** GET /api/search?q=&limit= — public course / programme / category search. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 120);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 8));
  try {
    const results = await searchSite(q, limit);
    return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ ok: false, results: [] }, { status: 500 });
  }
}
