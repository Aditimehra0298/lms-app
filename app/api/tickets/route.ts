import { NextRequest, NextResponse } from "next/server";
import {
  createSupportTicket,
  listSupportTickets,
  type TicketCategory,
} from "@/lib/server/support-ticket-service";
import {
  canAccessTicket,
  resolveTicketAuth,
  ticketAuthRequiredResponse,
  ticketForbiddenResponse,
} from "@/lib/server/ticket-api-auth";
import { sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/server/sanitize-user-text";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets — admin: full list; learner: own tickets only.
 */
export async function GET(req: NextRequest) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();

  try {
    const { searchParams } = req.nextUrl;
    const tickets = await listSupportTickets({
      status: searchParams.get("status")?.trim() || undefined,
      q: searchParams.get("q")?.trim() || undefined,
      token: searchParams.get("token")?.trim() || undefined,
    });

    const visible =
      auth.role === "admin"
        ? tickets
        : tickets.filter((t) => canAccessTicket(auth, t.userEmail));

    return NextResponse.json(
      { tickets: visible, issues: visible },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/tickets]", err);
    return NextResponse.json({ error: "Failed to fetch tickets." }, { status: 500 });
  }
}

/**
 * POST /api/tickets — create a support ticket (signed-in learner or admin).
 * userEmail is bound to the session — client cannot spoof another user.
 */
export async function POST(req: NextRequest) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const description = sanitizePlainText(
      String(body.description ?? body.issueText ?? body.message ?? ""),
      8000,
    );
    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const ticket = await createSupportTicket({
      subject: sanitizeOptionalPlainText(body.subject ? String(body.subject) : undefined, 500),
      description,
      category: (body.category as TicketCategory) || "LMS",
      studentId: body.studentId ? String(body.studentId).slice(0, 120) : undefined,
      userId: body.userId ? String(body.userId).slice(0, 120) : undefined,
      userName: sanitizeOptionalPlainText(body.userName ? String(body.userName) : undefined, 200),
      userEmail: auth.email,
      transactionId: body.transactionId ? String(body.transactionId).slice(0, 120) : undefined,
      paymentDate: body.paymentDate ? String(body.paymentDate).slice(0, 80) : undefined,
      screenshotUrl: body.screenshotUrl ? String(body.screenshotUrl).slice(0, 500) : undefined,
      priority:
        body.priority === "low" || body.priority === "medium" || body.priority === "high"
          ? body.priority
          : undefined,
    });

    return NextResponse.json(
      { ok: true, ticket, ticketNumber: ticket.issueToken },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create ticket.";
    console.error("[POST /api/tickets]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
