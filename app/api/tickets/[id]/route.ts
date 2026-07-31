import { NextRequest, NextResponse } from "next/server";
import { getTicketByIdOrToken } from "@/lib/server/support-ticket-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/:id — fetch ticket by cuid or token (e.g. SFT-PAY-1023)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ticket = await getTicketByIdOrToken(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ticket, issue: ticket });
  } catch (err) {
    console.error("[GET /api/tickets/:id]", err);
    return NextResponse.json({ error: "Failed to fetch ticket." }, { status: 500 });
  }
}
