import {
  buildLmsChatContext,
  buildOpenAiContextInstructions,
  type LmsChatContext,
} from "@/lib/server/chat-lms-context";
import { buildLocalChatReply, type ChatHistoryItem } from "@/lib/server/chat-local-reply";
import {
  isOpenAICompletionsConfigured,
  sendChatWithOpenAICompletions,
} from "@/lib/server/openai-completions-chat";
import { isOpenAIChatConfigured, sendChatWithOpenAI } from "@/lib/server/openai-chat-service";
import { isN8nChatConfigured, sendChatToN8n } from "@/lib/server/n8n-chat-service";
import { lookupRegistrationByEmail } from "@/lib/server/registration-lookup";

export type ChatSendInput = {
  message: string;
  sessionId?: string;
  pagePath?: string;
  threadId?: string;
  learnerEmail?: string;
  learnerName?: string;
  history?: ChatHistoryItem[];
};

export type ChatSendResult =
  | { ok: true; reply: string; threadId?: string; provider?: ChatProviderKind }
  | { ok: false; message: string };

export type ChatProviderKind = "openai" | "n8n" | "local";

async function resolveLearnerChatIdentity(input: {
  learnerEmail?: string;
  learnerName?: string;
}): Promise<{ learnerEmail?: string; learnerName?: string }> {
  const email = input.learnerEmail?.trim().toLowerCase();
  if (!email) {
    return {
      learnerEmail: undefined,
      learnerName: input.learnerName?.trim() || undefined,
    };
  }

  const row = await lookupRegistrationByEmail(email);
  const dbName = row?.name?.trim();
  return {
    learnerEmail: email,
    learnerName: dbName || input.learnerName?.trim() || undefined,
  };
}

function readProviderPreference(): "auto" | ChatProviderKind {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (raw === "openai" || raw === "n8n" || raw === "local") return raw;
  return "auto";
}

function providerTryOrder(): ChatProviderKind[] {
  const pref = readProviderPreference();
  const hasAssistant = isOpenAIChatConfigured();
  const hasCompletions = isOpenAICompletionsConfigured();
  const hasOpenAi = hasAssistant || hasCompletions;
  const hasN8n = isN8nChatConfigured();

  if (pref === "openai") return hasOpenAi ? ["openai", "n8n", "local"] : ["n8n", "local"];
  if (pref === "n8n") return hasN8n ? ["n8n", "openai", "local"] : hasOpenAi ? ["openai", "local"] : ["local"];
  if (pref === "local") return ["local"];

  const order: ChatProviderKind[] = [];
  if (hasN8n) order.push("n8n");
  if (hasOpenAi) order.push("openai");
  order.push("local");
  return order;
}

function isOpenAiAvailable(): boolean {
  return isOpenAICompletionsConfigured() || isOpenAIChatConfigured();
}

function isLocalChatAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function trimHistory(history?: ChatHistoryItem[]): ChatHistoryItem[] {
  if (!history?.length) return [];
  return history
    .filter((m) => m.content?.trim() && (m.role === "user" || m.role === "assistant"))
    .slice(-8);
}

/** Prefer n8n/OpenAI when configured; always fall back to MySQL-powered local replies. */
export async function sendChat(input: ChatSendInput): Promise<ChatSendResult> {
  const learner = await resolveLearnerChatIdentity(input);
  const history = trimHistory(input.history);

  let lmsContext: LmsChatContext | undefined;
  try {
    lmsContext = await buildLmsChatContext({
      learnerEmail: learner.learnerEmail,
      message: input.message,
      pagePath: input.pagePath,
    });
  } catch (err) {
    console.warn("[chat] Failed to load MySQL context:", err);
  }

  const openAiInstructions = lmsContext
    ? buildOpenAiContextInstructions(lmsContext)
    : undefined;

  for (const provider of providerTryOrder()) {
    if (provider === "openai" && isOpenAiAvailable()) {
      if (openAiInstructions && isOpenAICompletionsConfigured()) {
        const completions = await sendChatWithOpenAICompletions({
          message: input.message,
          systemContext: openAiInstructions,
          history,
        });
        if (completions.ok) {
          return { ok: true, reply: completions.reply, provider: "openai" };
        }
        console.warn("[chat] OpenAI completions failed:", completions.message);
      }

      if (isOpenAIChatConfigured()) {
        const result = await sendChatWithOpenAI({
          message: input.message,
          threadId: input.threadId,
          additionalInstructions: openAiInstructions,
        });
        if (result.ok) {
          return { ok: true, reply: result.reply, threadId: result.threadId, provider: "openai" };
        }
        console.warn("[chat] OpenAI assistant failed:", result.message);
      }
      continue;
    }

    if (provider === "n8n" && isN8nChatConfigured()) {
      const n8n = await sendChatToN8n({
        message: input.message,
        sessionId: input.sessionId,
        pagePath: input.pagePath,
        learnerEmail: learner.learnerEmail,
        learnerName: learner.learnerName,
        lmsContext,
        history,
      });
      if (n8n.ok) return { ok: true, reply: n8n.reply, provider: "n8n" };
      console.warn("[chat] n8n failed:", n8n.message);
      continue;
    }

    if (provider === "local" && lmsContext && isLocalChatAvailable()) {
      return {
        ok: true,
        reply: buildLocalChatReply(input.message, lmsContext, history),
        provider: "local",
      };
    }
  }

  return {
    ok: false,
    message:
      "Chat is temporarily unavailable. Check DATABASE_URL and n8n/OpenAI settings, then restart the server.",
  };
}

export function isChatConfigured(): boolean {
  return isOpenAiAvailable() || isN8nChatConfigured() || isLocalChatAvailable();
}

export function chatProvider(): ChatProviderKind | null {
  const order = providerTryOrder();
  return order[0] ?? null;
}
