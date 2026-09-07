import { NextRequest, NextResponse } from "next/server";
import { listSupportTickets } from "@/lib/server/support-ticket-service";
import {
  canAccessTicket,
  resolveTicketAuth,
  ticketAuthRequiredResponse,
} from "@/lib/server/ticket-api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/issues — admin: all; learner: own tickets only.
 */
export async function GET(req: NextRequest) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();

  try {
    const { searchParams } = req.nextUrl;
    const tickets = await listSupportTickets({
      token: searchParams.get("token")?.trim() || undefined,
      status: searchParams.get("status")?.trim() || undefined,
      q: searchParams.get("q")?.trim() || undefined,
    });

    const visible =
      auth.role === "admin"
        ? tickets
        : tickets.filter((t) => canAccessTicket(auth, t.userEmail));

    const issues = visible.map((t) => ({
      id: t.id,
      issueToken: t.issueToken,
      userId: t.userId,
      userName: t.userName,
      userEmail: t.userEmail,
      studentId: t.studentId,
      issueText: t.description,
      subject: t.subject,
      issueStatus: t.status === "resolved" ? "resolved" : t.status,
      category: t.category,
      priority: t.priority,
      sentiment: t.sentiment,
      transactionId: t.transactionId,
      paymentDate: t.paymentDate,
      screenshotUrl: t.screenshotUrl,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(
      { issues, tickets: visible },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    console.error("[GET /api/issues]", err);
    return NextResponse.json({ error: "Failed to fetch issues." }, { status: 500 });
  }
}
