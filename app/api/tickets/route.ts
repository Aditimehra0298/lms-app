import { NextRequest, NextResponse } from "next/server";
import {
  createSupportTicket,
  listSupportTickets,
  type TicketCategory,
} from "@/lib/server/support-ticket-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets — list tickets (admin dashboard)
 * Query: ?status=open|in_progress|resolved|closed & ?q= & ?token=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tickets = await listSupportTickets({
      status: searchParams.get("status")?.trim() || undefined,
      q: searchParams.get("q")?.trim() || undefined,
      token: searchParams.get("token")?.trim() || undefined,
    });
    return NextResponse.json({ tickets, issues: tickets });
  } catch (err) {
    console.error("[GET /api/tickets]", err);
    return NextResponse.json({ error: "Failed to fetch tickets." }, { status: 500 });
  }
}

/**
 * POST /api/tickets — create a support ticket
 * Body: { subject?, description, category?, studentId?, userEmail?, userName?,
 *         transactionId?, paymentDate?, screenshotUrl?, priority? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const description =
      String(body.description ?? body.issueText ?? body.message ?? "").trim();
    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const ticket = await createSupportTicket({
      subject: body.subject ? String(body.subject) : undefined,
      description,
      category: (body.category as TicketCategory) || "LMS",
      studentId: body.studentId ? String(body.studentId) : undefined,
      userId: body.userId ? String(body.userId) : undefined,
      userName: body.userName ? String(body.userName) : undefined,
      userEmail: body.userEmail ? String(body.userEmail) : undefined,
      transactionId: body.transactionId ? String(body.transactionId) : undefined,
      paymentDate: body.paymentDate ? String(body.paymentDate) : undefined,
      screenshotUrl: body.screenshotUrl ? String(body.screenshotUrl) : undefined,
      priority:
        body.priority === "low" || body.priority === "medium" || body.priority === "high"
          ? body.priority
          : undefined,
    });

    return NextResponse.json({ ok: true, ticket, ticketNumber: ticket.issueToken }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create ticket.";
    console.error("[POST /api/tickets]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
