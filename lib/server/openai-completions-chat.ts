import type { ChatHistoryItem } from "@/lib/server/chat-local-reply";

const OPENAI_BASE = "https://api.openai.com/v1";

function apiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function model(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

/** Chat via OpenAI Chat Completions (no Assistant ID required). */
export async function sendChatWithOpenAICompletions(input: {
  message: string;
  systemContext: string;
  history?: ChatHistoryItem[];
}): Promise<{ ok: true; reply: string } | { ok: false; message: string }> {
  const key = apiKey();
  const message = input.message.trim();
  if (!message) return { ok: false, message: "Message cannot be empty." };
  if (!key) return { ok: false, message: "OPENAI_API_KEY not configured." };

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: [
        input.systemContext.trim(),
        "",
        "Rules:",
        "- Answer only from the LMS database context provided.",
        "- Be warm and conversational — like a helpful advisor, not a FAQ bot.",
        "- When discussing courses, mention category, price, duration, and level when available.",
        "- If the user picks a category, list relevant courses from that category with prices.",
        "- Use relative paths like /courses/slug when linking to a course.",
        "- Never invent courses, prices, or enrollments.",
      ].join("\n"),
    },
  ];

  for (const item of (input.history ?? []).slice(-6)) {
    messages.push({ role: item.role, content: item.content });
  }
  messages.push({ role: "user", content: message });

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        messages,
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    const raw = await res.text();
    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { ok: false, message: raw.slice(0, 200) || `OpenAI ${res.status}` };
    }

    if (!res.ok) {
      return { ok: false, message: data.error?.message ?? `OpenAI ${res.status}` };
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false, message: "OpenAI returned an empty reply." };
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "OpenAI request failed" };
  }
}

export function isOpenAICompletionsConfigured(): boolean {
  return Boolean(apiKey());
}
