import {
  buildLmsChatContext,
  buildOpenAiContextInstructions,
  type LmsChatContext,
} from "@/lib/server/chat-lms-context";
import {
  buildLocalChatReply,
  detectChatIntent,
  type ChatHistoryItem,
} from "@/lib/server/chat-local-reply";
import { saveChatTurn } from "@/lib/server/chat-history-store";
import {
  createSupportTicket,
  extractPaymentTicketFields,
  looksLikePaymentProblem,
  paymentDetailsComplete,
} from "@/lib/server/support-ticket-service";
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
  learnerPhone?: string;
  /** Only true when the user has a real LMS session (not guest contact form). */
  authenticated?: boolean;
  history?: ChatHistoryItem[];
};

export type ChatSendResult =
  | {
      ok: true;
      reply: string;
      threadId?: string;
      provider?: ChatProviderKind;
      ticketNumber?: string;
      intent?: string;
    }
  | { ok: false; message: string };

export type ChatProviderKind = "openai" | "n8n" | "local";

async function resolveLearnerChatIdentity(input: {
  learnerEmail?: string;
  learnerName?: string;
  authenticated?: boolean;
}): Promise<{ learnerEmail?: string; learnerName?: string }> {
  const email = input.learnerEmail?.trim().toLowerCase();
  const providedName = input.learnerName?.trim() || undefined;

  if (!email) {
    return { learnerEmail: undefined, learnerName: providedName };
  }

  // Guests share contact details but are not authenticated — don't treat as logged-in account.
  if (!input.authenticated) {
    return { learnerEmail: email, learnerName: providedName };
  }

  const row = await lookupRegistrationByEmail(email);
  const dbName = row?.name?.trim();
  return {
    learnerEmail: email,
    learnerName: dbName || providedName,
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

function wantsEscalation(message: string): boolean {
  return /\b(create (a )?ticket|open (a )?ticket|escalate|talk to (a |the )?human|speak to support|human agent)\b/i.test(
    message,
  );
}

async function maybeCreateTicketFromMessage(input: {
  message: string;
  history: ChatHistoryItem[];
  learnerEmail?: string;
  learnerName?: string;
  learnerPhone?: string;
  pagePath?: string;
}): Promise<{ ticketNumber?: string; appendix?: string }> {
  const message = input.message.trim();
  if (!message) return {};

  const contactBits = [
    input.learnerName ? `Name: ${input.learnerName}` : "",
    input.learnerEmail ? `Email: ${input.learnerEmail}` : "",
    input.learnerPhone ? `Phone: ${input.learnerPhone}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const paymentFields = extractPaymentTicketFields(message, input.history);
  const historyBlob = input.history.map((h) => h.content).join("\n");
  const conversationHadPaymentAsk =
    looksLikePaymentProblem(message) ||
    looksLikePaymentProblem(historyBlob) ||
    /student id|transaction id|payment date/i.test(historyBlob);

  if (conversationHadPaymentAsk && paymentDetailsComplete(paymentFields)) {
    const description = [
      "Payment problem reported via chatbot.",
      `Student ID: ${paymentFields.studentId}`,
      `Transaction ID: ${paymentFields.transactionId}`,
      `Payment date: ${paymentFields.paymentDate}`,
      contactBits,
      `Latest message: ${message}`,
    ]
      .filter(Boolean)
      .join("\n");
    const ticket = await createSupportTicket({
      category: "PAY",
      subject: "Payment problem from chatbot",
      description,
      studentId: paymentFields.studentId,
      transactionId: paymentFields.transactionId,
      paymentDate: paymentFields.paymentDate,
      userEmail: input.learnerEmail,
      userName: input.learnerName,
      userId: paymentFields.studentId,
    });
    return {
      ticketNumber: ticket.issueToken,
      appendix: `\n\nI've opened support ticket **${ticket.issueToken}** (priority: ${ticket.priority}). Our team has been notified and will follow up.`,
    };
  }

  if (wantsEscalation(message) || (/create a ticket/i.test(message) && message.length > 20)) {
    const intent = detectChatIntent(message);
    const categoryMap: Record<string, string> = {
      payments: "PAY",
      certificates: "CERT",
      video: "VIDEO",
      login: "AUTH",
      progress: "QUIZ",
      assignments: "ASSIGN",
      courses: "COURSE",
      support: "TECH",
      faq: "FAQ",
    };
    const ticket = await createSupportTicket({
      category: categoryMap[intent] || "LMS",
      subject: `Chatbot escalation — ${intent}`,
      description: contactBits ? `${message}\n\n${contactBits}` : message,
      userEmail: input.learnerEmail,
      userName: input.learnerName,
    });
    return {
      ticketNumber: ticket.issueToken,
      appendix: `\n\nSupport ticket **${ticket.issueToken}** created (priority: ${ticket.priority}). The team has been notified.`,
    };
  }

  return {};
}

/** Prefer n8n/OpenAI when configured; always fall back to MySQL-powered local replies. */
export async function sendChat(input: ChatSendInput): Promise<ChatSendResult> {
  const message = input.message?.trim() ?? "";
  if (!message) {
    return { ok: false, message: "Message is required." };
  }

  const learner = await resolveLearnerChatIdentity(input);
  const history = trimHistory(input.history);
  const sessionId = (input.sessionId || input.threadId || "anonymous").slice(0, 128);
  const intent = detectChatIntent(message);
  const authenticated = Boolean(input.authenticated);

  let lmsContext: LmsChatContext | undefined;
  try {
    lmsContext = await buildLmsChatContext({
      // Only load private account rows when the learner is actually signed in.
      learnerEmail: authenticated ? learner.learnerEmail : undefined,
      message,
      pagePath: input.pagePath,
    });

    // Guests may share name/email/phone — use the name in chat, but keep isLoggedIn false.
    if (!authenticated && learner.learnerName) {
      lmsContext = {
        ...lmsContext,
        isLoggedIn: false,
        learner: {
          email: learner.learnerEmail || "",
          name: learner.learnerName,
          accountType: null,
          registrationCode: null,
          companyName: null,
          countryName: null,
        },
      };
    }
  } catch (err) {
    console.warn("[chat] Failed to load MySQL context:", err);
  }

  const openAiInstructions = lmsContext
    ? buildOpenAiContextInstructions(lmsContext)
    : undefined;

  let result: ChatSendResult | null = null;

  for (const provider of providerTryOrder()) {
    if (provider === "openai" && isOpenAiAvailable()) {
      if (openAiInstructions && isOpenAICompletionsConfigured()) {
        const completions = await sendChatWithOpenAICompletions({
          message,
          systemContext: openAiInstructions,
          history,
        });
        if (completions.ok) {
          result = { ok: true, reply: completions.reply, provider: "openai", intent };
          break;
        }
        console.warn("[chat] OpenAI completions failed:", completions.message);
      }

      if (isOpenAIChatConfigured()) {
        const oa = await sendChatWithOpenAI({
          message,
          threadId: input.threadId,
          additionalInstructions: openAiInstructions,
        });
        if (oa.ok) {
          result = {
            ok: true,
            reply: oa.reply,
            threadId: oa.threadId,
            provider: "openai",
            intent,
          };
          break;
        }
        console.warn("[chat] OpenAI assistant failed:", oa.message);
      }
      continue;
    }

    if (provider === "n8n" && isN8nChatConfigured()) {
      const n8n = await sendChatToN8n({
        message,
        sessionId: input.sessionId,
        pagePath: input.pagePath,
        learnerEmail: learner.learnerEmail,
        learnerName: learner.learnerName,
        lmsContext,
        history,
      });
      if (n8n.ok) {
        result = { ok: true, reply: n8n.reply, provider: "n8n", intent };
        break;
      }
      console.warn("[chat] n8n failed:", n8n.message);
      continue;
    }

    if (provider === "local" && lmsContext && isLocalChatAvailable()) {
      result = {
        ok: true,
        reply: buildLocalChatReply(message, lmsContext, history),
        provider: "local",
        intent,
      };
      break;
    }
  }

  if (!result?.ok) {
    void import("@/lib/server/admin-system-notifications")
      .then(({ pushAdminNotification }) =>
        pushAdminNotification({
          dedupeKey: "runtime:chat-unavailable",
          title: "Site chat is down",
          detail:
            "A visitor tried to use the chat helper, but no reply could be generated. Check chat setup with your technical team.",
          severity: "warning",
          source: "chat",
          panelHint: "Settings",
        }),
      )
      .catch(() => undefined);

    return {
      ok: false,
      message:
        "Chat is temporarily unavailable. Check DATABASE_URL and n8n/OpenAI settings, then restart the server.",
    };
  }

  let reply = result.reply;
  let ticketNumber: string | undefined;

  try {
    const ticketed = await maybeCreateTicketFromMessage({
      message,
      history,
      learnerEmail: learner.learnerEmail,
      learnerName: learner.learnerName,
      learnerPhone: input.learnerPhone?.trim() || undefined,
      pagePath: input.pagePath,
    });
    if (ticketed.appendix) {
      reply = `${reply}${ticketed.appendix}`;
      ticketNumber = ticketed.ticketNumber;
    }
  } catch (err) {
    console.warn("[chat] ticket create failed:", err);
  }

  void saveChatTurn({
    sessionId,
    role: "user",
    content: message,
    learnerEmail: learner.learnerEmail,
    learnerName: learner.learnerName,
    intent,
    pagePath: input.pagePath,
  });
  void saveChatTurn({
    sessionId,
    role: "assistant",
    content: reply,
    learnerEmail: learner.learnerEmail,
    learnerName: learner.learnerName,
    intent,
    provider: result.provider,
    pagePath: input.pagePath,
    ticketToken: ticketNumber,
  });

  return {
    ok: true,
    reply,
    threadId: result.threadId,
    provider: result.provider,
    ticketNumber,
    intent,
  };
}

export function isChatConfigured(): boolean {
  return isOpenAiAvailable() || isN8nChatConfigured() || isLocalChatAvailable();
}

export function chatProvider(): ChatProviderKind | null {
  const order = providerTryOrder();
  return order[0] ?? null;
}
