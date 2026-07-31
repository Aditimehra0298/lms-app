/** Lightweight sentiment heuristic for support ticket priority (no extra API cost). */

export type ChatSentiment = "angry" | "frustrated" | "neutral" | "positive";
export type TicketPriority = "low" | "medium" | "high";

const ANGRY =
  /\b(angry|furious|worst|scam|fraud|useless|hate|ridiculous|unacceptable|disgusting|terrible|awful|refund now|lawsuit|lawyer|stolen|cheat)\b/i;
const FRUSTRATED =
  /\b(frustrated|annoyed|upset|still not|again|won't work|doesn'?t work|not working|broken|failed|error|bug|issue|problem|urgent|asap|immediately)\b/i;
const POSITIVE =
  /\b(thanks|thank you|great|awesome|love|helpful|perfect|appreciate)\b/i;

export function analyzeChatSentiment(text: string): ChatSentiment {
  const t = text.trim();
  if (!t) return "neutral";
  if (ANGRY.test(t)) return "angry";
  if (FRUSTRATED.test(t)) return "frustrated";
  if (POSITIVE.test(t)) return "positive";
  return "neutral";
}

export function priorityFromSentiment(sentiment: ChatSentiment): TicketPriority {
  if (sentiment === "angry") return "high";
  if (sentiment === "frustrated") return "medium";
  if (sentiment === "positive") return "low";
  return "medium";
}
