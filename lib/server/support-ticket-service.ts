import { prisma } from "@/lib/prisma";
import {
  analyzeChatSentiment,
  priorityFromSentiment,
  type ChatSentiment,
  type TicketPriority,
} from "@/lib/server/chat-sentiment";
import { pushAdminNotification } from "@/lib/server/admin-system-notifications";
import { queueAdminActivityEmail } from "@/lib/server/admin-activity-email";

export type TicketCategory =
  | "TECH"
  | "QUIZ"
  | "VIDEO"
  | "AUTH"
  | "PAY"
  | "CERT"
  | "LMS"
  | "ASSIGN"
  | "FAQ"
  | "COURSE";

export type CreateTicketInput = {
  subject?: string;
  description: string;
  category?: TicketCategory | string;
  studentId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  transactionId?: string;
  paymentDate?: string;
  screenshotUrl?: string;
  /** Override auto sentiment/priority */
  priority?: TicketPriority;
};

export type SupportTicketDto = {
  id: string;
  issueToken: string;
  studentId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  subject: string | null;
  description: string;
  category: string | null;
  priority: string;
  sentiment: string | null;
  status: string;
  transactionId: string | null;
  paymentDate: string | null;
  screenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeStatus(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "resolved" || s === "closed") return s === "resolved" ? "resolved" : "closed";
  if (s === "in_progress" || s === "in-progress") return "in_progress";
  if (s === "open") return "open";
  return "";
}

export function mapIssueToTicket(row: {
  id: string;
  issueToken: string;
  studentId?: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  subject?: string | null;
  issueText: string;
  category: string | null;
  priority?: string | null;
  sentiment?: string | null;
  issueStatus: string;
  transactionId?: string | null;
  paymentDate?: string | null;
  screenshotUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SupportTicketDto {
  return {
    id: row.id,
    issueToken: row.issueToken,
    studentId: row.studentId ?? null,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    subject: row.subject ?? null,
    description: row.issueText,
    category: row.category,
    priority: row.priority || "medium",
    sentiment: row.sentiment ?? null,
    status: row.issueStatus === "closed" ? "resolved" : row.issueStatus,
    transactionId: row.transactionId ?? null,
    paymentDate: row.paymentDate ?? null,
    screenshotUrl: row.screenshotUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextIssueToken(category: string): Promise<string> {
  const cat = (category || "LMS").toUpperCase().slice(0, 8);
  for (let i = 0; i < 8; i++) {
    const n = Math.floor(1000 + Math.random() * 9000);
    const token = `SFT-${cat}-${n}`;
    const exists = await prisma.lmsIssue.findUnique({ where: { issueToken: token }, select: { id: true } });
    if (!exists) return token;
  }
  return `SFT-${cat}-${Date.now().toString().slice(-4)}`;
}

export async function createSupportTicket(input: CreateTicketInput): Promise<SupportTicketDto> {
  const description = input.description.trim();
  if (!description) throw new Error("Ticket description is required.");

  const category = (input.category || "LMS").toUpperCase();
  const sentiment: ChatSentiment = analyzeChatSentiment(description);
  const priority: TicketPriority = input.priority || priorityFromSentiment(sentiment);
  const issueToken = await nextIssueToken(category);
  const subject =
    input.subject?.trim() ||
    `${category} support request${input.userEmail ? ` — ${input.userEmail}` : ""}`;

  const row = await prisma.lmsIssue.create({
    data: {
      issueToken,
      userId: input.userId?.trim() || input.studentId?.trim() || null,
      userName: input.userName?.trim() || null,
      userEmail: input.userEmail?.trim().toLowerCase() || null,
      studentId: input.studentId?.trim() || null,
      issueText: description,
      subject,
      issueStatus: "open",
      category,
      priority,
      sentiment,
      transactionId: input.transactionId?.trim() || null,
      paymentDate: input.paymentDate?.trim() || null,
      screenshotUrl: input.screenshotUrl?.trim() || null,
    },
  });

  void pushAdminNotification({
    dedupeKey: `ticket:${issueToken}`,
    title: `New ${priority} priority ticket ${issueToken}`,
    detail: subject.slice(0, 180),
    severity: priority === "high" ? "critical" : priority === "medium" ? "warning" : "info",
    source: "chat",
    panelHint: "Support Tickets",
  }).catch(() => undefined);

  queueAdminActivityEmail({
    kind: "support-ticket",
    subject: `[Ticket ${issueToken}] ${priority} — ${subject.slice(0, 80)}`,
    title: `New ${priority} priority support ticket`,
    detail: description.slice(0, 500),
    lines: {
      Token: issueToken,
      Priority: priority,
      Category: category || undefined,
      Email: input.userEmail?.trim().toLowerCase() || undefined,
      Name: input.userName?.trim() || undefined,
      Subject: subject.slice(0, 200),
    },
  });

  return mapIssueToTicket(row);
}

export async function getTicketByIdOrToken(idOrToken: string): Promise<SupportTicketDto | null> {
  const key = idOrToken.trim();
  if (!key) return null;
  const row = await prisma.lmsIssue.findFirst({
    where: {
      OR: [{ id: key }, { issueToken: key.toUpperCase() }],
    },
  });
  return row ? mapIssueToTicket(row) : null;
}

export async function updateTicketStatus(
  idOrToken: string,
  statusRaw: string,
): Promise<SupportTicketDto> {
  const status = normalizeStatus(statusRaw);
  if (!status || !["open", "in_progress", "resolved", "closed"].includes(status)) {
    throw new Error("Invalid status. Allowed: open, in_progress, resolved, closed");
  }
  const existing = await getTicketByIdOrToken(idOrToken);
  if (!existing) throw new Error("Ticket not found.");

  const stored = status === "resolved" ? "resolved" : status;
  const row = await prisma.lmsIssue.update({
    where: { id: existing.id },
    data: { issueStatus: stored },
  });
  return mapIssueToTicket(row);
}

export async function listSupportTickets(filters?: {
  status?: string;
  q?: string;
  token?: string;
  take?: number;
}): Promise<SupportTicketDto[]> {
  const status = filters?.status ? normalizeStatus(filters.status) || filters.status : "";
  const token = filters?.token?.trim().toUpperCase() || "";
  const q = filters?.q?.trim() || "";

  const rows = await prisma.lmsIssue.findMany({
    where: {
      ...(token ? { issueToken: token } : {}),
      ...(status
        ? status === "resolved" || status === "closed"
          ? { issueStatus: { in: ["resolved", "closed"] } }
          : { issueStatus: status }
        : {}),
      ...(q
        ? {
            OR: [
              { issueText: { contains: q } },
              { subject: { contains: q } },
              { userEmail: { contains: q } },
              { issueToken: { contains: q.toUpperCase() } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: filters?.take ?? 200,
  });

  // Sort high priority first (prisma string order is alphabetical: high, low, medium — fix in JS)
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return rows
    .map(mapIssueToTicket)
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || b.createdAt.localeCompare(a.createdAt));
}

/** Detect payment-problem details from free text (supports turn-by-turn short answers). */
export function extractPaymentTicketFields(
  text: string,
  history: Array<{ role: string; content: string }> = [],
): {
  studentId?: string;
  transactionId?: string;
  paymentDate?: string;
} {
  const turns = [...history.map((h) => h.content), text];
  const blob = turns.join("\n");

  let studentId =
    blob.match(/\b(?:student\s*(?:id|number)|learner\s*id)\s*[:=#]?\s*([A-Za-z0-9_-]{3,64})/i)?.[1] ||
    blob.match(/\bstudent\s+([A-Za-z0-9_-]{4,64})\b/i)?.[1];
  let transactionId = blob.match(
    /\b(?:txn|transaction|payment|razorpay|order)\s*(?:id|ref)?\s*[:=#]?\s*([A-Za-z0-9_-]{6,128})/i,
  )?.[1];
  let paymentDate =
    blob.match(/\b(?:paid\s*on|payment\s*date|date)\s*[:=]?\s*([0-9]{1,4}[-/.\s][A-Za-z0-9/-]{2,20})/i)?.[1] ||
    blob.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/)?.[1] ||
    blob.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];

  // Map short answers to the previous assistant question.
  for (let i = 0; i < history.length; i++) {
    const prev = history[i];
    const next = history[i + 1]?.content ?? (i === history.length - 1 ? text : "");
    if (prev.role !== "assistant" || !next?.trim()) continue;
    const q = prev.content.toLowerCase();
    const a = next.trim();
    if (!studentId && /student id/.test(q) && /^[A-Za-z0-9_-]{3,64}$/.test(a)) studentId = a;
    if (!transactionId && /transaction id/.test(q) && /^[A-Za-z0-9_-]{6,128}$/.test(a)) {
      transactionId = a;
    }
    if (
      !paymentDate &&
      /payment date/.test(q) &&
      (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(a) || /^\d{4}-\d{2}-\d{2}$/.test(a))
    ) {
      paymentDate = a;
    }
  }

  // Current message as short answer to last assistant question
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant")?.content || "";
  const short = text.trim();
  if (lastAssistant) {
    const q = lastAssistant.toLowerCase();
    if (!studentId && /student id/.test(q) && /^[A-Za-z0-9_-]{3,64}$/.test(short)) studentId = short;
    if (!transactionId && /transaction id/.test(q) && /^[A-Za-z0-9_-]{6,128}$/.test(short)) {
      transactionId = short;
    }
    if (
      !paymentDate &&
      /payment date/.test(q) &&
      (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(short) || /^\d{4}-\d{2}-\d{2}$/.test(short))
    ) {
      paymentDate = short;
    }
  }

  return {
    studentId: studentId?.trim(),
    transactionId: transactionId?.trim(),
    paymentDate: paymentDate?.trim(),
  };
}

export function looksLikePaymentProblem(text: string): boolean {
  return /\b(payment|paid|razorpay|refund|charged|transaction|invoice|checkout)\b/i.test(text) &&
    /\b(fail|failed|problem|issue|error|not|didn't|pending|stuck|help|wrong)\b/i.test(text);
}

export function paymentDetailsComplete(fields: {
  studentId?: string;
  transactionId?: string;
  paymentDate?: string;
}): boolean {
  return Boolean(fields.studentId && fields.transactionId && fields.paymentDate);
}
