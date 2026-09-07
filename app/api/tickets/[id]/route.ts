import { NextRequest, NextResponse } from "next/server";
import { getTicketByIdOrToken } from "@/lib/server/support-ticket-service";
import {
  canAccessTicket,
  resolveTicketAuth,
  ticketAuthRequiredResponse,
  ticketForbiddenResponse,
} from "@/lib/server/ticket-api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/:id — by cuid or token. Owner or admin only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = resolveTicketAuth(req);
  if (!auth) return ticketAuthRequiredResponse();

  try {
    const { id } = await params;
    const ticket = await getTicketByIdOrToken(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    if (!canAccessTicket(auth, ticket.userEmail)) {
      return ticketForbiddenResponse();
    }
    return NextResponse.json(
      { ticket, issue: ticket },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/tickets/:id]", err);
    return NextResponse.json({ error: "Failed to fetch ticket." }, { status: 500 });
  }
}
