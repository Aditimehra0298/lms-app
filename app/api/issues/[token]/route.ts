import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessTicket,
  resolveTicketAuth,
  ticketAuthRequiredResponse,
  ticketForbiddenResponse,
} from "@/lib/server/ticket-api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/issues/[token] — owner or admin only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();

  try {
    const { token } = await params;
    const issue = await prisma.lmsIssue.findUnique({
      where: { issueToken: token },
    });
    if (!issue) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    if (!canAccessTicket(auth, issue.userEmail)) {
      return ticketForbiddenResponse();
    }
    return NextResponse.json(
      { issue },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/issues/[token]]", err);
    return NextResponse.json({ error: "Failed to fetch ticket." }, { status: 500 });
  }
}

/**
 * PATCH /api/issues/[token] — admin only (status changes).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();
  if (auth.role !== "admin") return ticketForbiddenResponse();

  try {
    const { token } = await params;
    const body = await req.json();
    const status: string = body.status ?? "";

    const allowed = ["open", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowed.join(", ")}` },
        { status: 400 },
      );
    }

    const updated = await prisma.lmsIssue.update({
      where: { issueToken: token },
      data: { issueStatus: status },
    });

    return NextResponse.json(
      { issue: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    console.error("[PATCH /api/issues/[token]]", err);
    return NextResponse.json({ error: "Failed to update ticket." }, { status: 500 });
  }
}
