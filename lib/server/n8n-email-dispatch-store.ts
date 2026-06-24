import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type EmailDispatchEvent =
  | "course.purchased"
  | "course.completed"
  | "course.feedback.requested"
  | "session.reminder";

type DispatchRow = {
  key: string;
  event: EmailDispatchEvent;
  learnerEmail: string;
  courseSlug: string;
  dispatchKey: string;
  sentAt: string | null;
  scheduledFor: string | null;
  payload: Record<string, unknown> | null;
  lastError: string | null;
};

type StoreFile = {
  rows: DispatchRow[];
};

const STORE_PATH = join(process.cwd(), "data", "n8n-email-dispatch.json");

function readStore(): StoreFile {
  try {
    if (!existsSync(STORE_PATH)) return { rows: [] };
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return Array.isArray(parsed.rows) ? parsed : { rows: [] };
  } catch {
    return { rows: [] };
  }
}

function writeStore(store: StoreFile) {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function buildEmailDispatchKey(input: {
  event: EmailDispatchEvent;
  learnerEmail: string;
  courseSlug?: string;
  dispatchKey?: string;
}): string {
  const email = input.learnerEmail.trim().toLowerCase();
  const slug = (input.courseSlug ?? "").trim().toLowerCase();
  const extra = (input.dispatchKey ?? "").trim();
  return `${input.event}|${email}|${slug}|${extra}`;
}

export function wasEmailDispatchSent(key: string): boolean {
  const row = readStore().rows.find((r) => r.key === key);
  return Boolean(row?.sentAt);
}

export function markEmailDispatchSent(input: {
  event: EmailDispatchEvent;
  learnerEmail: string;
  courseSlug?: string;
  dispatchKey?: string;
}): void {
  const key = buildEmailDispatchKey(input);
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.rows.find((r) => r.key === key);
  if (existing) {
    existing.sentAt = now;
    existing.lastError = null;
  } else {
    store.rows.push({
      key,
      event: input.event,
      learnerEmail: input.learnerEmail.trim().toLowerCase(),
      courseSlug: (input.courseSlug ?? "").trim().toLowerCase(),
      dispatchKey: (input.dispatchKey ?? "").trim(),
      sentAt: now,
      scheduledFor: null,
      payload: null,
      lastError: null,
    });
  }
  writeStore(store);
}

export function markEmailDispatchFailed(input: {
  event: EmailDispatchEvent;
  learnerEmail: string;
  courseSlug?: string;
  dispatchKey?: string;
  message: string;
}): void {
  const key = buildEmailDispatchKey(input);
  const store = readStore();
  const existing = store.rows.find((r) => r.key === key);
  if (existing) {
    existing.lastError = input.message.slice(0, 500);
  } else {
    store.rows.push({
      key,
      event: input.event,
      learnerEmail: input.learnerEmail.trim().toLowerCase(),
      courseSlug: (input.courseSlug ?? "").trim().toLowerCase(),
      dispatchKey: (input.dispatchKey ?? "").trim(),
      sentAt: null,
      scheduledFor: null,
      payload: null,
      lastError: input.message.slice(0, 500),
    });
  }
  writeStore(store);
}

export function scheduleEmailDispatch(input: {
  event: EmailDispatchEvent;
  learnerEmail: string;
  courseSlug: string;
  dispatchKey?: string;
  scheduledFor: Date;
  payload: Record<string, unknown>;
}): boolean {
  const key = buildEmailDispatchKey(input);
  const store = readStore();
  if (store.rows.some((r) => r.key === key && r.sentAt)) return false;
  if (store.rows.some((r) => r.key === key)) return false;

  store.rows.push({
    key,
    event: input.event,
    learnerEmail: input.learnerEmail.trim().toLowerCase(),
    courseSlug: input.courseSlug.trim().toLowerCase(),
    dispatchKey: (input.dispatchKey ?? "").trim(),
    sentAt: null,
    scheduledFor: input.scheduledFor.toISOString(),
    payload: input.payload,
    lastError: null,
  });
  writeStore(store);
  return true;
}

export function listDueScheduledDispatches(now = new Date()): DispatchRow[] {
  const ts = now.getTime();
  return readStore().rows.filter((row) => {
    if (row.sentAt || !row.scheduledFor || !row.payload) return false;
    const due = Date.parse(row.scheduledFor);
    return Number.isFinite(due) && due <= ts;
  });
}

export function completeScheduledDispatch(key: string, error?: string): void {
  const store = readStore();
  const row = store.rows.find((r) => r.key === key);
  if (!row) return;
  if (error) {
    row.lastError = error.slice(0, 500);
    writeStore(store);
    return;
  }
  row.sentAt = new Date().toISOString();
  row.lastError = null;
  writeStore(store);
}
