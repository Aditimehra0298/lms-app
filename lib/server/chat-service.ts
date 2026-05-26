import { isOpenAIChatConfigured, sendChatWithOpenAI } from "@/lib/server/openai-chat-service";
import { sendChatToN8n } from "@/lib/server/n8n-chat-service";

export type ChatSendInput = {
  message: string;
  sessionId?: string;
  pagePath?: string;
  threadId?: string;
};

export type ChatSendResult =
  | { ok: true; reply: string; threadId?: string }
  | { ok: false; message: string };

/** Prefer OpenAI when configured; otherwise n8n webhook. */
export async function sendChat(input: ChatSendInput): Promise<ChatSendResult> {
  if (isOpenAIChatConfigured()) {
    const result = await sendChatWithOpenAI({
      message: input.message,
      threadId: input.threadId,
    });
    if (result.ok) {
      return { ok: true, reply: result.reply, threadId: result.threadId };
    }
    return result;
  }

  const n8n = await sendChatToN8n({
    message: input.message,
    sessionId: input.sessionId,
    pagePath: input.pagePath,
  });
  if (n8n.ok) return { ok: true, reply: n8n.reply };
  return n8n;
}

export function isChatConfigured(): boolean {
  return isOpenAIChatConfigured() || Boolean(process.env.N8N_CHAT_WEBHOOK_URL?.trim());
}

export function chatProvider(): "openai" | "n8n" | null {
  if (isOpenAIChatConfigured()) return "openai";
  if (process.env.N8N_CHAT_WEBHOOK_URL?.trim()) return "n8n";
  return null;
}
