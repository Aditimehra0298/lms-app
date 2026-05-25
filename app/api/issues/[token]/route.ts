import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/issues/[token]
 * Fetch a single ticket by its token, e.g. SFT-TECH-1023
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const issue = await prisma.lmsIssue.findUnique({
      where: { issueToken: token },
    });
    if (!issue) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ issue });
  } catch (err: any) {
    console.error("[GET /api/issues/[token]]", err);
    return NextResponse.json({ error: "Failed to fetch ticket." }, { status: 500 });
  }
}

/**
 * PATCH /api/issues/[token]
 * Update the status of a support ticket.
 * Body: { status: "open" | "in_progress" | "closed" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const status: string = body.status ?? "";

    const allowed = ["open", "in_progress", "closed"];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.lmsIssue.update({
      where: { issueToken: token },
      data: { issueStatus: status },
    });

    return NextResponse.json({ issue: updated });
  } catch (err: any) {
    // P2025 = record not found
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    console.error("[PATCH /api/issues/[token]]", err);
    return NextResponse.json({ error: "Failed to update ticket." }, { status: 500 });
  }
}
