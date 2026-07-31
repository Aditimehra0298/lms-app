import { NextRequest, NextResponse } from "next/server";
import { updateTicketStatus } from "@/lib/server/support-ticket-service";

export const dynamic = "force-dynamic";

/**
 * PUT /api/tickets/:id/status
 * Body: { status: "open" | "in_progress" | "resolved" | "closed" }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { status?: string };
    if (!body.status?.trim()) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const ticket = await updateTicketStatus(id, body.status);
    return NextResponse.json({ ok: true, ticket });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update status.";
    const status = message.includes("not found") ? 404 : 400;
    console.error("[PUT /api/tickets/:id/status]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
