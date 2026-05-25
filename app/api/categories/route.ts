import { NextResponse } from "next/server";
import { readAdminContent } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

/** Public read-only list for the marketing site (active categories only). */
export async function GET() {
  const content = await readAdminContent();
  const categories = content.categories.filter((c) => c.isActive);
  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
