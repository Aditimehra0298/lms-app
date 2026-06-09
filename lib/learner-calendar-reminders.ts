/** Personal calendar reminders — stored per learner in localStorage. */

export type LearnerCalendarReminder = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = "sft_learner_calendar_reminders";
export const LEARNER_CALENDAR_REMINDERS_EVENT = "sft_learner_calendar_reminders_updated";

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const m = key.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function readLearnerCalendarReminders(): LearnerCalendarReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is LearnerCalendarReminder =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as LearnerCalendarReminder).id === "string" &&
        typeof (r as LearnerCalendarReminder).date === "string" &&
        typeof (r as LearnerCalendarReminder).title === "string",
    );
  } catch {
    return [];
  }
}

function writeLearnerCalendarReminders(rows: LearnerCalendarReminder[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(LEARNER_CALENDAR_REMINDERS_EVENT));
}

export function addLearnerCalendarReminder(input: {
  date: Date;
  title: string;
  note?: string;
}): LearnerCalendarReminder {
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const row: LearnerCalendarReminder = {
    id: `lr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: toDateKey(input.date),
    title,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const next = [...readLearnerCalendarReminders(), row];
  writeLearnerCalendarReminders(next);
  return row;
}

export function removeLearnerCalendarReminder(id: string) {
  const next = readLearnerCalendarReminders().filter((r) => r.id !== id);
  writeLearnerCalendarReminders(next);
}
