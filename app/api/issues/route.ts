import { NextRequest, NextResponse } from "next/server";
import { listSupportTickets } from "@/lib/server/support-ticket-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/issues
 * Fetch all support tickets, with optional filters:
 *   ?token=SFT-TECH-1023   — find by exact token
 *   ?status=open            — filter by status (open | in_progress | resolved | closed)
 *   ?q=video                — fuzzy search on issueText
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tickets = await listSupportTickets({
      token: searchParams.get("token")?.trim() || undefined,
      status: searchParams.get("status")?.trim() || undefined,
      q: searchParams.get("q")?.trim() || undefined,
    });

    // Keep legacy shape for AdminSupportTickets while exposing new fields.
    const issues = tickets.map((t) => ({
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

    return NextResponse.json({ issues, tickets });
  } catch (err: unknown) {
    console.error("[GET /api/issues]", err);
    return NextResponse.json({ error: "Failed to fetch issues." }, { status: 500 });
  }
}
