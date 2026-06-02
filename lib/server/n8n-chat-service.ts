import { buildN8nWebhookHeaders } from "@/lib/server/n8n-webhook-auth";

export type ChatMessage = { role: "user" | "assistant"; content: string };

function chatWebhookUrl(): string | null {
  return process.env.N8N_CHAT_WEBHOOK_URL?.trim() || null;
}

function extractReply(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  for (const key of ["output", "text", "response", "message", "reply", "answer"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const nested = obj.data ?? obj.result ?? obj.body;
  if (nested !== data) {
    const inner = extractReply(nested);
    if (inner) return inner;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const inner = extractReply(item);
      if (inner) return inner;
    }
  }

  return null;
}

/** Proxy learner message to n8n chat / AI Agent webhook. */
export async function sendChatToN8n(input: {
  message: string;
  sessionId?: string;
  pagePath?: string;
}): Promise<{ ok: true; reply: string } | { ok: false; message: string }> {
  const message = input.message.trim();
  if (!message) {
    return { ok: false, message: "Message cannot be empty." };
  }

  const url = chatWebhookUrl();
  if (!url) {
    return {
      ok: false,
      message:
        "Chat is not configured. Add N8N_CHAT_WEBHOOK_URL to .env.local (n8n Chat Trigger or AI Agent webhook), then restart the dev server.",
    };
  }

  const payload = {
    chatInput: message,
    message,
    sessionId: input.sessionId?.trim() || "lms-guest",
    pagePath: input.pagePath?.trim() || undefined,
    source: "lms",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }

    if (!res.ok) {
      const hint = typeof parsed === "object" && parsed && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : raw.slice(0, 200);
      return {
        ok: false,
        message: `Chat service returned ${res.status}. ${hint || "Check your n8n workflow is active."}`,
      };
    }

    const reply = extractReply(parsed);
    if (!reply) {
      return {
        ok: false,
        message:
          "Chat service responded but no reply text was found. Ensure your n8n workflow returns output, text, or message.",
      };
    }

    return { ok: true, reply };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat request failed";
    return { ok: false, message: msg };
  }
}

export function isChatConfigured(): boolean {
  return Boolean(chatWebhookUrl());
}
