import { NextResponse } from "next/server";
import { chatProvider, isChatConfigured, sendChat } from "@/lib/server/chat-service";
import { getChatCategoriesForUi } from "@/lib/server/chat-course-catalog";
import type { ChatHistoryItem } from "@/lib/server/chat-local-reply";

export const dynamic = "force-dynamic";

/** GET — whether chat is configured (no secrets exposed). */
export async function GET() {
  let categories: Awaited<ReturnType<typeof getChatCategoriesForUi>> = [];
  try {
    categories = await getChatCategoriesForUi();
  } catch {
    /* catalog optional for status check */
  }

  return NextResponse.json({
    configured: isChatConfigured(),
    provider: chatProvider(),
    categories,
  });
}

/** POST — send a message (OpenAI Assistant, n8n, or local MySQL fallback). */
export async function POST(request: Request) {
  let body: {
    message?: string;
    sessionId?: string;
    pagePath?: string;
    threadId?: string;
    learnerEmail?: string;
    learnerName?: string;
    learnerPhone?: string;
    authenticated?: boolean;
    history?: ChatHistoryItem[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await sendChat({
      message: body.message ?? "",
      sessionId: body.sessionId,
      pagePath: body.pagePath,
      threadId: body.threadId,
      learnerEmail: body.learnerEmail,
      learnerName: body.learnerName,
      learnerPhone: body.learnerPhone,
      authenticated: Boolean(body.authenticated),
      history: body.history,
    });

    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.message.includes("not configured") ? 503 : 400,
      });
    }

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      ...(result.threadId ? { threadId: result.threadId } : {}),
      ...(result.provider ? { provider: result.provider } : {}),
      ...(result.ticketNumber ? { ticketNumber: result.ticketNumber } : {}),
      ...(result.intent ? { intent: result.intent } : {}),
    });
  } catch (err) {
    console.error("[api/chat]", err);
    return NextResponse.json({ ok: false, message: "Chat request failed." }, { status: 503 });
  }
}
