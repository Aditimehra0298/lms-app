import { parseFlexibleDate } from "@/lib/my-learning-dashboard-events";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { getProgramTrainingDays, isWorkshopProgram } from "@/lib/workshop-program";

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export type ParsedLiveSchedule = {
  weekdays: number[];
  startHour: number;
  startMinute: number;
  timezoneLabel: string;
  /** Fixed offset minutes east of UTC — IST = 330. */
  utcOffsetMinutes: number;
};

export type UpcomingLiveSession = {
  programSlug: string;
  courseName: string;
  instructorName: string;
  joinLink: string;
  meetingPlatform: string;
  sessionStart: Date;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  timezone: string;
  dispatchKey: string;
};

function timezoneOffsetMinutes(label: string): number {
  const t = label.trim().toUpperCase();
  if (t === "IST" || t.includes("INDIA")) return 330;
  if (t === "UTC" || t === "GMT") return 0;
  return 330;
}

/** Parse e.g. "Tue, Thu, Sat (7:00 PM - 9:00 PM IST)". */
export function parseLiveSchedule(schedule: string): ParsedLiveSchedule | null {
  const raw = schedule.trim();
  if (!raw) return null;

  const paren = raw.match(/\(([^)]+)\)/);
  const timePart = paren?.[1]?.trim() ?? raw;
  const beforeParen = paren ? raw.slice(0, paren.index).trim() : "";

  const weekdays: number[] = [];
  const dayTokens = beforeParen
    .split(/[,/&]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  for (const token of dayTokens) {
    const day = WEEKDAY_MAP[token];
    if (day !== undefined && !weekdays.includes(day)) weekdays.push(day);
  }

  const timeMatch = timePart.match(
    /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM))?\s*([A-Za-z/+]+)?/i,
  );
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? "0");
  const ampm = timeMatch[3].toUpperCase();
  const tzLabel = timeMatch[4]?.trim() || "IST";

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return {
    weekdays: weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6],
    startHour: hour,
    startMinute: minute,
    timezoneLabel: tzLabel,
    utcOffsetMinutes: timezoneOffsetMinutes(tzLabel),
  };
}

function sessionStartUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  utcOffsetMinutes: number,
): Date {
  const localAsUtc = Date.UTC(year, month, day, hour, minute, 0, 0);
  return new Date(localAsUtc - utcOffsetMinutes * 60_000);
}

function formatSessionDateLabel(d: Date, tzLabel: string): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tzLabel === "IST" ? "Asia/Kolkata" : "UTC",
  });
}

function formatSessionTimeLabel(hour: number, minute: number, ampm?: string): string {
  if (ampm) {
    const h12 = hour % 12 || 12;
    return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
  }
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function detectMeetingPlatform(joinLink: string): string {
  const url = joinLink.toLowerCase();
  if (url.includes("zoom.us") || url.includes("zoom.com")) return "Zoom";
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) return "Microsoft Teams";
  if (url.includes("meet.google.com")) return "Google Meet";
  return "Live video";
}

export function listUpcomingLiveSessionsInWindow(input: {
  program: TutorLedProgramStored;
  windowStart: Date;
  windowEnd: Date;
}): UpcomingLiveSession[] {
  const { program, windowStart, windowEnd } = input;
  const joinLink = program.liveJoinUrl?.trim();
  if (!joinLink || program.published === false) return [];

  const parsed = parseLiveSchedule(program.schedule ?? "");
  if (!parsed) return [];

  const batchStart = parseFlexibleDate(program.nextBatchDate ?? "");
  if (!batchStart) return [];

  const trainingDays = getProgramTrainingDays(program);
  const batchEnd = new Date(batchStart);
  batchEnd.setDate(batchStart.getDate() + Math.max(trainingDays - 1, 0));

  const sessions: UpcomingLiveSession[] = [];
  const workshop = isWorkshopProgram(program);
  const scanStart = new Date(windowStart);
  scanStart.setDate(scanStart.getDate() - 1);
  const scanEnd = new Date(windowEnd);
  scanEnd.setDate(scanEnd.getDate() + 1);

  for (let cursor = new Date(scanStart); cursor <= scanEnd; cursor.setDate(cursor.getDate() + 1)) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    const dayStart = new Date(y, m, d);

    if (dayStart < batchStart || dayStart > batchEnd) continue;

    if (!workshop && !parsed.weekdays.includes(dayStart.getDay())) continue;

    const sessionStart = sessionStartUtc(
      y,
      m,
      d,
      parsed.startHour,
      parsed.startMinute,
      parsed.utcOffsetMinutes,
    );

    if (sessionStart < windowStart || sessionStart > windowEnd) continue;

    const ampm = parsed.startHour >= 12 ? "PM" : "AM";
    const dispatchKey = `${program.slug}|${sessionStart.toISOString()}`;

    sessions.push({
      programSlug: program.slug,
      courseName: program.title,
      instructorName: program.trainer?.name?.trim() || "Your instructor",
      joinLink,
      meetingPlatform: detectMeetingPlatform(joinLink),
      sessionStart,
      sessionDateLabel: formatSessionDateLabel(sessionStart, parsed.timezoneLabel),
      sessionTimeLabel: formatSessionTimeLabel(
        parsed.startHour % 12 || 12,
        parsed.startMinute,
        ampm,
      ),
      timezone: parsed.timezoneLabel,
      dispatchKey,
    });
  }

  return sessions;
}
