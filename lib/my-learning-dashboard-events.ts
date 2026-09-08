import type { DashboardCalendarReminder } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import type { TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { getProgramTrainingDays, isWorkshopProgram } from "@/lib/workshop-program";
import {
  type LearnerCalendarReminder,
  parseDateKey,
} from "@/lib/learner-calendar-reminders";
import type { OrgCalendarReminder, OrgCalendarReminderSymbol } from "@/lib/organization-calendar-reminders";
export type CalendarEventKind = "live" | "workshop" | "exam" | "certificate" | "course" | "reminder";

export type DashboardCalendarEvent = {
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  href: string;
  kind: CalendarEventKind;
  /** Custom icon for org / personal reminders */
  symbol?: OrgCalendarReminderSymbol | "bell";
  addedByName?: string;
};

export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  href: string;
  tone: "amber" | "emerald" | "sky" | "rose" | "violet";
  kind: CalendarEventKind | "course";
  symbol?: OrgCalendarReminderSymbol | "bell";
};

export type NotificationFilter = "all" | "live" | "exam" | "certificate" | "reminder";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** Single line — e.g. "Saturday, June 13, 2026" */
export function formatCalendarDayHeading(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** @deprecated Use formatCalendarDayHeading */
export function formatSelectedDateDetail(date: Date): string {
  return formatCalendarDayHeading(date);
}

export function extractScheduleTime(schedule: string): string {
  const paren = schedule.match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() || schedule.trim() || "See program hub";
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return startOfDay(new Date(parsed));
  const m = trimmed.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const again = Date.parse(`${m[1]} ${m[2]} ${m[3]}`);
    if (!Number.isNaN(again)) return startOfDay(new Date(again));
  }
  return null;
}

export function buildTutorLedCalendarEvents(
  enrollments: TutorLedLiveHubRow[],
  programs: TutorLedProgramStored[],
): DashboardCalendarEvent[] {
  const events: DashboardCalendarEvent[] = [];

  for (const row of enrollments) {
    const program = programs.find((p) => p.slug === row.slug);
    const batchDate = parseFlexibleDate(program?.nextBatchDate ?? "");
    const days = program ? getProgramTrainingDays(program) : row.trainingDays;
    const schedule = program?.schedule?.trim();
    const workshop = isWorkshopProgram(program);

    if (batchDate) {
      if (workshop) {
        events.push({
          id: `workshop-${row.slug}`,
          date: startOfDay(batchDate),
          title: `Workshop — ${row.title}`,
          subtitle: schedule ? `One day · ${schedule}` : "One-day live workshop on Zoom",
          href: `/my-learning/course/${encodeURIComponent(row.slug)}#zoom-live`,
          kind: "workshop",
        });
      } else {
        for (let i = 0; i < days; i++) {
          const date = new Date(batchDate);
          date.setDate(batchDate.getDate() + i);
          events.push({
            id: `live-${row.slug}-day-${i + 1}`,
            date: startOfDay(date),
            title: `Day ${i + 1} — ${row.title}`,
            subtitle: schedule ? `Live on Zoom · ${schedule}` : "Live on Zoom",
            href: `/my-learning/course/${encodeURIComponent(row.slug)}#zoom-live`,
            kind: "live",
          });
        }
      }
    } else {
      // No parseable batch date — skip inventing a "today" session on the calendar.
    }

    if (!workshop && row.examUnlocked) {
      const examDate = batchDate ? new Date(batchDate) : new Date();
      if (batchDate) examDate.setDate(batchDate.getDate() + days);
      events.push({
        id: `exam-${row.slug}`,
        date: startOfDay(examDate),
        title: "Final exam available",
        subtitle: row.title,
        href: `/my-learning/course/${encodeURIComponent(row.slug)}/exam?module=final`,
        kind: "exam",
      });
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buildAdminReminderEvents(
  reminders: DashboardCalendarReminder[] | undefined,
): DashboardCalendarEvent[] {
  if (!reminders?.length) return [];
  const events: DashboardCalendarEvent[] = [];
  for (const r of reminders) {
    if (r.published === false || !r.title?.trim()) continue;
    const date = parseDateKey(r.date);
    if (!date) continue;
    events.push({
      id: `admin-reminder-${r.id}`,
      date,
      title: r.title.trim(),
      subtitle: r.body?.trim() || "From SF Trainings",
      href: r.href?.trim() || "/my-learning?tab=dashboard",
      kind: "reminder",
    });
  }
  return events;
}

export function buildUserReminderEvents(
  reminders: LearnerCalendarReminder[],
): DashboardCalendarEvent[] {
  return reminders
    .filter((r) => r.title?.trim() && parseDateKey(r.date))
    .map((r) => ({
      id: `user-reminder-${r.id}`,
      date: parseDateKey(r.date)!,
      title: r.title.trim(),
      subtitle: r.note?.trim() || "Your reminder",
      href: "/my-learning/calendar",
      kind: "reminder" as const,
      symbol: "bell" as const,
    }));
}

export function buildOrgUserReminderEvents(
  reminders: OrgCalendarReminder[],
): DashboardCalendarEvent[] {
  return reminders
    .filter((r) => r.methodTitle?.trim() && r.addedByName?.trim() && parseDateKey(r.date))
    .map((r) => ({
      id: `org-user-reminder-${r.id}`,
      date: parseDateKey(r.date)!,
      title: r.methodTitle.trim(),
      subtitle: r.note?.trim() || `${r.addedByName.trim()} · Team notification`,
      href: "/my-learning/calendar",
      kind: "reminder" as const,
      symbol: r.symbol,
      addedByName: r.addedByName.trim(),
    }));
}

export function mergeCalendarEvents(
  ...groups: DashboardCalendarEvent[][]
): DashboardCalendarEvent[] {
  return groups.flat().sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Short label under the day number in the month grid. */
export function primaryDayCellLabel(events: DashboardCalendarEvent[]): string | null {
  if (!events.length) return null;

  const reminders = events.filter((e) => e.kind === "reminder");
  if (reminders.length > 0) {
    const t = reminders[0].title;
    return t.length > 11 ? `${t.slice(0, 10)}…` : t;
  }

  const live = events.find((e) => e.kind === "live");
  if (live) {
    const dayMatch = live.title.match(/^Day (\d+)/);
    if (dayMatch) return `Day ${dayMatch[1]}`;
    const short = live.title.split("—")[0]?.trim() ?? live.title;
    return short.length > 11 ? `${short.slice(0, 10)}…` : short;
  }

  if (events.some((e) => e.kind === "exam")) return "Exam";
  if (events.some((e) => e.kind === "certificate")) return "Cert";
  return null;
}

export function isUserReminderEvent(id: string): boolean {
  return id.startsWith("user-reminder-");
}

export function isOrgUserReminderEvent(id: string): boolean {
  return id.startsWith("org-user-reminder-");
}

export function isCustomReminderEvent(id: string): boolean {
  return isUserReminderEvent(id) || isOrgUserReminderEvent(id);
}

export function userReminderIdFromEvent(id: string): string | null {
  return isUserReminderEvent(id) ? id.replace(/^user-reminder-/, "") : null;
}

export function orgUserReminderIdFromEvent(id: string): string | null {
  return isOrgUserReminderEvent(id) ? id.replace(/^org-user-reminder-/, "") : null;
}

export function buildDashboardNotifications(input: {
  calendarEvents: DashboardCalendarEvent[];
  examTasks: Array<{
    label: string;
    courseTitle: string;
    href: string;
    status: string;
    ready: boolean;
    unlocked?: boolean;
  }>;
  certificates: Array<{ courseTitle: string; status: string; href: string }>;
  coursesNotStarted: Array<{ title: string; href: string }>;
  now?: Date;
}): DashboardNotification[] {
  const now = input.now ?? new Date();
  const items: DashboardNotification[] = [];
  const inSevenDays = new Date(now);
  inSevenDays.setDate(now.getDate() + 7);

  const liveSeen = new Set<string>();
  for (const ev of input.calendarEvents) {
    if (ev.kind !== "live") continue;
    if (ev.date < startOfDay(now) || ev.date > inSevenDays) continue;
    const slug = ev.id.split("-")[1] ?? ev.id;
    if (liveSeen.has(slug)) continue;
    liveSeen.add(slug);
    const hoursUntil = Math.round((ev.date.getTime() - now.getTime()) / 3_600_000);
    const timeLabel =
      hoursUntil > 0 && hoursUntil < 48
        ? `Starts in ${hoursUntil}h`
        : formatShortDate(ev.date);
    items.push({
      id: `n-${ev.id}`,
      title: ev.title.replace(/^Day \d+ — /, "Live session"),
      body: ev.subtitle ?? "Join from your program hub",
      timeLabel,
      href: ev.href,
      tone: "violet",
      kind: "live",
    });
  }

  const examByCourse = new Map<string, { task: (typeof input.examTasks)[0]; count: number }>();
  for (const task of input.examTasks) {
    if (task.status === "Completed" || !task.ready || task.unlocked === false) continue;
    const row = examByCourse.get(task.courseTitle);
    if (row) row.count += 1;
    else examByCourse.set(task.courseTitle, { task, count: 1 });
  }
  for (const { task, count } of examByCourse.values()) {
    items.push({
      id: `n-exam-${task.courseTitle}`,
      title: count > 1 ? `${count} module exams pending` : task.label,
      body: task.courseTitle,
      timeLabel: "Exam pending",
      href: "/my-learning?tab=assignments",
      tone: "amber",
      kind: "exam",
    });
  }

  for (const cert of input.certificates) {
    if (cert.status !== "ready") continue;
    items.push({
      id: `n-cert-${cert.href}`,
      title: "Certificate ready",
      body: cert.courseTitle,
      timeLabel: "Download now",
      href: cert.href,
      tone: "sky",
      kind: "certificate",
    });
  }

  for (const course of input.coursesNotStarted.slice(0, 2)) {
    items.push({
      id: `n-start-${course.href}`,
      title: "Course not started",
      body: course.title,
      timeLabel: "Begin learning",
      href: course.href,
      tone: "emerald",
      kind: "reminder",
    });
  }

  for (const ev of input.calendarEvents) {
    if (ev.kind !== "reminder") continue;
    if (ev.date < startOfDay(now) || ev.date > inSevenDays) continue;
    const isUser = isUserReminderEvent(ev.id);
    const isOrgUser = isOrgUserReminderEvent(ev.id);
    items.push({
      id: `n-${ev.id}`,
      title: ev.title,
      body:
        ev.subtitle ??
        (isOrgUser && ev.addedByName
          ? `${ev.addedByName} · Team notification`
          : isUser
            ? "Your reminder"
            : "From SF Trainings"),
      timeLabel: formatShortDate(ev.date),
      href: ev.href,
      tone: "emerald",
      kind: "reminder",
      symbol: ev.symbol,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "n-welcome",
      title: "You're all caught up",
      body: "Browse tutor-led programs or continue your courses.",
      timeLabel: formatShortDate(now),
      href: "/my-learning?tab=live",
      tone: "amber",
      kind: "reminder",
    });
  }

  return items.slice(0, 12);
}

export function getCalendarGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; date: Date | null }> = [];

  for (let i = 0; i < startOffset; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });
  while (cells.length < 42) cells.push({ day: null, date: null });

  return cells;
}

export function eventsOnDay(events: DashboardCalendarEvent[], date: Date): DashboardCalendarEvent[] {
  return events.filter((e) => isSameDay(e.date, date));
}

export function eventKindColor(kind: CalendarEventKind): string {
  switch (kind) {
    case "live":
      return "bg-violet-400";
    case "workshop":
      return "bg-rose-400";
    case "exam":
      return "bg-[#FFC107]";
    case "certificate":
      return "bg-sky-400";
    case "course":
      return "bg-violet-400";
    default:
      return "bg-emerald-400";
  }
}

export function eventKindRing(kind: CalendarEventKind): string {
  switch (kind) {
    case "live":
      return "ring-violet-400/70";
    case "workshop":
      return "ring-rose-400/70";
    case "exam":
      return "ring-[#FFC107]/70";
    case "certificate":
      return "ring-sky-400/70";
    default:
      return "ring-emerald-400/70";
  }
}

export function primaryEventKindOnDay(events: DashboardCalendarEvent[]): CalendarEventKind | null {
  if (events.some((e) => e.kind === "workshop")) return "workshop";
  if (events.some((e) => e.kind === "live")) return "live";
  if (events.some((e) => e.kind === "exam")) return "exam";
  if (events.some((e) => e.kind === "certificate")) return "certificate";
  if (events.length > 0) return events[0].kind;
  return null;
}
