/** Team calendar reminders — stored per organisation admin browser (localStorage). */

export type OrgCalendarReminderSymbol =
  | "bell"
  | "video"
  | "users"
  | "mail"
  | "calendar"
  | "award"
  | "exam";

export type OrgCalendarReminder = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Who added this team notification */
  addedByName: string;
  /** Short title / method label shown on the calendar */
  methodTitle: string;
  symbol: OrgCalendarReminderSymbol;
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = "sft_org_calendar_reminders";
export const ORG_CALENDAR_REMINDERS_EVENT = "sft_org_calendar_reminders_updated";

export const ORG_CALENDAR_SYMBOL_OPTIONS: {
  id: OrgCalendarReminderSymbol;
  label: string;
}[] = [
  { id: "bell", label: "Reminder" },
  { id: "video", label: "Live session" },
  { id: "users", label: "Team" },
  { id: "mail", label: "Email" },
  { id: "calendar", label: "Schedule" },
  { id: "award", label: "Certificate" },
  { id: "exam", label: "Exam" },
];

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

export function readOrgCalendarReminders(): OrgCalendarReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is OrgCalendarReminder =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as OrgCalendarReminder).id === "string" &&
        typeof (r as OrgCalendarReminder).date === "string" &&
        typeof (r as OrgCalendarReminder).addedByName === "string" &&
        typeof (r as OrgCalendarReminder).methodTitle === "string" &&
        typeof (r as OrgCalendarReminder).symbol === "string",
    );
  } catch {
    return [];
  }
}

function writeOrgCalendarReminders(rows: OrgCalendarReminder[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(ORG_CALENDAR_REMINDERS_EVENT));
}

export function addOrgCalendarReminder(input: {
  date: Date;
  addedByName: string;
  methodTitle: string;
  symbol: OrgCalendarReminderSymbol;
  note?: string;
}): OrgCalendarReminder {
  const addedByName = input.addedByName.trim();
  const methodTitle = input.methodTitle.trim();
  if (!addedByName) throw new Error("Name required");
  if (!methodTitle) throw new Error("Method title required");
  const row: OrgCalendarReminder = {
    id: `or-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: toDateKey(input.date),
    addedByName,
    methodTitle,
    symbol: input.symbol,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const next = [...readOrgCalendarReminders(), row];
  writeOrgCalendarReminders(next);
  return row;
}

export function removeOrgCalendarReminder(id: string) {
  const next = readOrgCalendarReminders().filter((r) => r.id !== id);
  writeOrgCalendarReminders(next);
}
