import { prisma } from "@/lib/prisma";

const OPENAI_BASE = "https://api.openai.com/v1";

function apiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function assistantId(): string | null {
  return process.env.OPENAI_ASSISTANT_ID?.trim() || null;
}

function openaiHeaders(): HeadersInit | null {
  const key = apiKey();
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };
}

async function openaiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = openaiHeaders();
  if (!headers) throw new Error("OpenAI API key not configured");

  const res = await fetch(`${OPENAI_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    const err =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: { message?: string } }).error?.message ?? raw)
        : raw.slice(0, 300);
    throw new Error(err || `OpenAI ${res.status}`);
  }

  return data as T;
}

async function createThread(): Promise<string> {
  const data = await openaiJson<{ id: string }>("/threads", { method: "POST", body: "{}" });
  return data.id;
}

async function addUserMessage(threadId: string, content: string): Promise<void> {
  await openaiJson(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ role: "user", content }),
  });
}

function detectIssueCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("quiz") || t.includes("test") || t.includes("exam")) return "QUIZ";
  if (t.includes("video") || t.includes("buffer") || t.includes("play")) return "VIDEO";
  if (t.includes("login") || t.includes("password") || t.includes("sign in")) return "AUTH";
  if (t.includes("payment") || t.includes("checkout") || t.includes("purchase")) return "PAY";
  if (t.includes("certificate") || t.includes("cert")) return "CERT";
  if (t.includes("lms") || t.includes("platform") || t.includes("bug")) return "LMS";
  return "TECH";
}

function generateIssueToken(category: string): string {
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  return `SFT-${category}-${ticketNumber}`;
}

type RunStatus = {
  status: string;
  last_error?: { message?: string };
  required_action?: {
    submit_tool_outputs: {
      tool_calls: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
  };
};

async function submitToolOutputs(
  threadId: string,
  runId: string,
  toolOutputs: Array<{ tool_call_id: string; output: string }>,
): Promise<void> {
  await openaiJson(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
    method: "POST",
    body: JSON.stringify({ tool_outputs: toolOutputs }),
  });
}

async function runAssistant(
  threadId: string,
  additionalInstructions?: string,
  userMessage?: string,
): Promise<string> {
  const aid = assistantId();
  if (!aid) throw new Error("OPENAI_ASSISTANT_ID not configured");

  const runBody: { assistant_id: string; additional_instructions?: string } = {
    assistant_id: aid,
  };
  const instructions = additionalInstructions?.trim();
  if (instructions) runBody.additional_instructions = instructions;

  const run = await openaiJson<{ id: string }>(`/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify(runBody),
  });

  const runId = run.id;
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const status = await openaiJson<RunStatus>(`/threads/${threadId}/runs/${runId}`);

    if (status.status === "completed") return runId;

    if (status.status === "requires_action") {
      const toolCalls = status.required_action?.submit_tool_outputs.tool_calls ?? [];
      const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "flag_technical_issue") {
          let issueText = userMessage ?? "Technical issue reported via chat";
          try {
            const args = JSON.parse(toolCall.function.arguments) as { description?: string };
            if (args.description?.trim()) issueText = args.description.trim();
          } catch {
            /* use default */
          }

          const category = detectIssueCategory(issueText);
          const token = generateIssueToken(category);

          try {
            await prisma.lmsIssue.create({
              data: {
                issueToken: token,
                issueText,
                issueStatus: "open",
                category,
              },
            });
          } catch (dbErr) {
            console.warn("[chat] Failed to save issue ticket:", dbErr);
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({
              status: "success",
              token,
              message: `Support ticket ${token} created.`,
            }),
          });
        } else {
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({ status: "unsupported_tool" }),
          });
        }
      }

      if (toolOutputs.length) {
        await submitToolOutputs(threadId, runId, toolOutputs);
      }
      await new Promise((r) => setTimeout(r, 800));
      continue;
    }

    if (status.status === "failed" || status.status === "cancelled" || status.status === "expired") {
      throw new Error(status.last_error?.message ?? `Assistant run ${status.status}`);
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  throw new Error("Assistant took too long to respond. Try again.");
}

async function latestAssistantText(threadId: string): Promise<string> {
  const data = await openaiJson<{
    data: Array<{ role: string; content: Array<{ type: string; text?: { value?: string } }> }>;
  }>(`/threads/${threadId}/messages?order=desc&limit=20`);

  for (const msg of data.data ?? []) {
    if (msg.role !== "assistant") continue;
    for (const block of msg.content ?? []) {
      if (block.type === "text" && block.text?.value?.trim()) {
        return block.text.value.trim();
      }
    }
  }

  throw new Error("Assistant returned no text.");
}

/** Chat via OpenAI Assistants API (uses OPENAI_API_KEY + OPENAI_ASSISTANT_ID). */
export async function sendChatWithOpenAI(input: {
  message: string;
  threadId?: string;
  additionalInstructions?: string;
}): Promise<
  | { ok: true; reply: string; threadId: string }
  | { ok: false; message: string }
> {
  const message = input.message.trim();
  if (!message) return { ok: false, message: "Message cannot be empty." };
  if (!apiKey()) {
    return { ok: false, message: "Add OPENAI_API_KEY to .env.local and restart the dev server." };
  }
  if (!assistantId()) {
    return {
      ok: false,
      message: "Add OPENAI_ASSISTANT_ID to .env.local and restart the dev server.",
    };
  }

  try {
    let threadId = input.threadId?.trim();
    if (!threadId) threadId = await createThread();

    await addUserMessage(threadId, message);
    await runAssistant(threadId, input.additionalInstructions, message);
    const reply = await latestAssistantText(threadId);

    return { ok: true, reply, threadId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    return { ok: false, message: msg };
  }
}

export function isOpenAIChatConfigured(): boolean {
  return Boolean(apiKey() && assistantId());
}
