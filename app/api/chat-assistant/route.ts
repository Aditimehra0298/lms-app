import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/** Detect issue category from the description text to build the SFT token prefix. */
function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("quiz") || t.includes("test") || t.includes("exam") || t.includes("assessment"))
    return "QUIZ";
  if (t.includes("video") || t.includes("buffer") || t.includes("play") || t.includes("stream"))
    return "VIDEO";
  if (t.includes("login") || t.includes("password") || t.includes("access") || t.includes("sign in"))
    return "AUTH";
  if (t.includes("checkout") || t.includes("payment") || t.includes("purchase") || t.includes("pay"))
    return "PAY";
  if (t.includes("certificate") || t.includes("cert") || t.includes("badge"))
    return "CERT";
  if (t.includes("lms") || t.includes("platform") || t.includes("portal") || t.includes("bug") || t.includes("error"))
    return "LMS";
  return "TECH";
}

/** Generate a unique SFT support token, e.g. SFT-TECH-1023 */
function generateToken(category: string): string {
  const ticketNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit
  return `SFT-${category}-${ticketNumber}`;
}

export async function POST(req: Request) {
  try {
    const { threadId, message } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured in environment variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: "OPENAI_ASSISTANT_ID is not configured in environment variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Create thread if not provided, or reuse the existing thread
    const threadIdToUse = threadId || (await openai.beta.threads.create()).id;

    // 2. Add the user's message to the thread
    await openai.beta.threads.messages.create(
      threadIdToUse,
      {
        role: "user",
        content: message,
      }
    );

    // 3. Create native stream response
    const stream = new ReadableStream({
      async start(controller) {
        const sendText = (text: string) => {
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text)}\n`));
        };

        const sendData = (data: any) => {
          controller.enqueue(new TextEncoder().encode(`d:${JSON.stringify(data)}\n`));
        };

        // Send thread ID to the client first so it saves to localStorage
        sendData({ threadId: threadIdToUse });

        async function runAssistantStream(runStream: any) {
          for await (const event of runStream) {
            if (event.event === "thread.message.delta") {
              const content = event.data.delta.content;
              if (content) {
                for (const part of content) {
                  if (part.type === "text" && part.text?.value) {
                    sendText(part.text.value);
                  }
                }
              }
            } else if (event.event === "thread.run.requires_action") {
              const run = event.data;
              const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
              const toolOutputs = [];

              for (const toolCall of toolCalls) {
                if (toolCall.function.name === "flag_technical_issue") {
                  const args = JSON.parse(toolCall.function.arguments);
                  const issueText = args.description || message;
                  const category = detectCategory(issueText);
                  const token = generateToken(category);

                  // Persist ticket in the database
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
                    console.error("[chat-assistant] Failed to save issue ticket:", dbErr);
                  }

                  // Send token to client
                  sendData({
                    type: "technical_issue_token",
                    token,
                    category,
                    issueDescription: issueText,
                  });

                  toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify({
                      status: "success",
                      token,
                      message: "Technical issue token generated and stored successfully.",
                    }),
                  });
                } else {
                  toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify({ error: "Unsupported tool" }),
                  });
                }
              }

              // Submit output and run the next stream
              const nextRunStream = openai.beta.threads.runs.submitToolOutputsStream(
                run.id,
                {
                  thread_id: threadIdToUse,
                  tool_outputs: toolOutputs,
                }
              );
              await runAssistantStream(nextRunStream);
            }
          }
        }

        try {
          const runStream = openai.beta.threads.runs.stream(threadIdToUse, {
            assistant_id: assistantId,
          });
          await runAssistantStream(runStream);
        } catch (err) {
          console.error("OpenAI stream error:", err);
          controller.enqueue(new TextEncoder().encode(`error:${JSON.stringify(err instanceof Error ? err.message : String(err))}\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error: any) {
    console.error("Assistant Route Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
