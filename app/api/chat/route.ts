import { NextResponse } from "next/server";
import { chatProvider, isChatConfigured, sendChat } from "@/lib/server/chat-service";

export const dynamic = "force-dynamic";

/** GET — whether chat is configured (no secrets exposed). */
export async function GET() {
  return NextResponse.json({
    configured: isChatConfigured(),
    provider: chatProvider(),
  });
}

/** POST — send a message (OpenAI Assistant or n8n). */
export async function POST(request: Request) {
  let body: { message?: string; sessionId?: string; pagePath?: string; threadId?: string };
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
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.message.includes("not configured") ? 503 : 400 });
    }
    return NextResponse.json({
      ok: true,
      reply: result.reply,
      ...(result.threadId ? { threadId: result.threadId } : {}),
    });
  } catch (err) {
    console.error("[api/chat]", err);
    return NextResponse.json({ ok: false, message: "Chat request failed." }, { status: 503 });
  }
}
