import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/issues
 * Fetch all support tickets, with optional filters:
 *   ?token=SFT-TECH-1023   — find by exact token
 *   ?status=open            — filter by status (open | in_progress | closed)
 *   ?q=video                — fuzzy search on issueText
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const token = searchParams.get("token")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const q = searchParams.get("q")?.trim() ?? "";

    const issues = await prisma.lmsIssue.findMany({
      where: {
        ...(token ? { issueToken: token } : {}),
        ...(status ? { issueStatus: status } : {}),
        ...(q ? { issueText: { contains: q } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ issues });
  } catch (err: any) {
    console.error("[GET /api/issues]", err);
    return NextResponse.json({ error: "Failed to fetch issues." }, { status: 500 });
  }
}
