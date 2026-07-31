import { prisma } from "@/lib/prisma";

export type ChatHistoryRole = "user" | "assistant" | "system";

export async function saveChatTurn(input: {
  sessionId: string;
  role: ChatHistoryRole;
  content: string;
  learnerEmail?: string;
  learnerName?: string;
  intent?: string;
  provider?: string;
  pagePath?: string;
  ticketToken?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sessionId = input.sessionId.trim() || "anonymous";
  const content = input.content.trim();
  if (!content) return;

  try {
    await prisma.lmsChatHistory.create({
      data: {
        sessionId: sessionId.slice(0, 128),
        learnerEmail: input.learnerEmail?.trim().toLowerCase() || null,
        learnerName: input.learnerName?.trim() || null,
        role: input.role,
        content,
        intent: input.intent?.slice(0, 64) || null,
        provider: input.provider?.slice(0, 32) || null,
        pagePath: input.pagePath?.slice(0, 512) || null,
        ticketToken: input.ticketToken?.slice(0, 32) || null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.warn("[chat-history] save failed:", err);
  }
}

export async function listChatHistory(sessionId: string, take = 40) {
  return prisma.lmsChatHistory.findMany({
    where: { sessionId: sessionId.trim() },
    orderBy: { createdAt: "asc" },
    take,
  });
}
