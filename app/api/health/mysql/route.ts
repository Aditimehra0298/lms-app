import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET — returns `{ ok: true }` when DATABASE_URL connects; use to verify Workbench / server MySQL. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json({ ok: true, message: "MySQL connection OK" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        message: "Cannot reach MySQL. Set DATABASE_URL in .env.local and run migrations.",
        detail: message,
      },
      { status: 503 },
    );
  }
}
