"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { DashboardCalendarReminder } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import type { TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import {
  addLearnerCalendarReminder,
  LEARNER_CALENDAR_REMINDERS_EVENT,
  readLearnerCalendarReminders,
  removeLearnerCalendarReminder,
} from "@/lib/learner-calendar-reminders";
import {
  addOrgCalendarReminder,
  ORG_CALENDAR_REMINDERS_EVENT,
  ORG_CALENDAR_SYMBOL_OPTIONS,
  readOrgCalendarReminders,
  removeOrgCalendarReminder,
  type OrgCalendarReminderSymbol,
} from "@/lib/organization-calendar-reminders";
import {
  buildAdminReminderEvents,
  buildDashboardNotifications,
  buildOrgUserReminderEvents,
  buildTutorLedCalendarEvents,
  buildUserReminderEvents,
  eventKindColor,
  eventsOnDay,
  extractScheduleTime,
  formatCalendarDayHeading,
  formatMonthYear,
  formatShortDate,
  getCalendarGrid,
  isCustomReminderEvent,
  isOrgUserReminderEvent,
  isSameDay,
  isUserReminderEvent,
  mergeCalendarEvents,
  orgUserReminderIdFromEvent,
  primaryDayCellLabel,
  eventKindRing,
  primaryEventKindOnDay,
  startOfDay,
  userReminderIdFromEvent,
  type CalendarEventKind,
  type NotificationFilter,
} from "@/lib/my-learning-dashboard-events";
import {
  ArrowLeft,
  Award,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileQuestion,
  GraduationCap,
  Headphones,
  HelpCircle,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Users,
  Video,
} from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const LEGEND: { kind: CalendarEventKind; label: string }[] = [
  { kind: "live", label: "Live session" },
  { kind: "workshop", label: "Workshop" },
  { kind: "exam", label: "Exam" },
  { kind: "certificate", label: "Certificate" },
  { kind: "reminder", label: "Reminder" },
];

type CalendarViewMode = "month" | "week" | "list";

type ExamTask = {
  label: string;
  courseTitle: string;
  href: string;
  status: string;
  ready: boolean;
  unlocked?: boolean;
};

export type MyLearningCalendarViewProps = {
  tutorLedEnrollments: TutorLedLiveHubRow[];
  tutorLedPrograms: TutorLedProgramStored[];
  examTasks: ExamTask[];
  certificateAlerts: Array<{ courseTitle: string; status: string; href: string }>;
  coursesNotStarted: Array<{ title: string; href: string }>;
  adminCalendarReminders?: DashboardCalendarReminder[];
  today?: Date;
  showPageHeader?: boolean;
  variant?: "individual" | "organization";
  defaultAddedByName?: string;
};

function symbolIcon(symbol?: OrgCalendarReminderSymbol | "bell") {
  switch (symbol) {
    case "video":
      return Video;
    case "users":
      return Users;
    case "mail":
      return Mail;
    case "calendar":
      return CalendarDays;
    case "award":
      return Award;
    case "exam":
      return GraduationCap;
    default:
      return Bell;
  }
}

function notificationIcon(
  kind: CalendarEventKind | "course",
  symbol?: OrgCalendarReminderSymbol | "bell",
) {
  if (symbol) return symbolIcon(symbol);
  switch (kind) {
    case "live":
    case "workshop":
      return Video;
    case "exam":
      return GraduationCap;
    case "certificate":
      return Award;
    default:
      return Bell;
  }
}

export function MyLearningCalendarView({
  tutorLedEnrollments,
  tutorLedPrograms,
  examTasks,
  certificateAlerts,
  coursesNotStarted,
  adminCalendarReminders = [],
  today = new Date(),
  showPageHeader = true,
  variant = "individual",
  defaultAddedByName = "",
}: MyLearningCalendarViewProps) {
  const isOrg = variant === "organization";
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(() => startOfDay(today));
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [notifFilter, setNotifFilter] = useState<NotificationFilter>("all");
  const [userReminders, setUserReminders] = useState(() => readLearnerCalendarReminders());
  const [orgReminders, setOrgReminders] = useState(() => readOrgCalendarReminders());
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [orgAddedByName, setOrgAddedByName] = useState(defaultAddedByName);
  const [orgMethodTitle, setOrgMethodTitle] = useState("");
  const [orgSymbol, setOrgSymbol] = useState<OrgCalendarReminderSymbol>("bell");
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    setOrgAddedByName((prev) => prev || defaultAddedByName);
  }, [defaultAddedByName]);

  useEffect(() => {
    const syncLearner = () => setUserReminders(readLearnerCalendarReminders());
    const syncOrg = () => setOrgReminders(readOrgCalendarReminders());
    syncLearner();
    syncOrg();
    window.addEventListener(LEARNER_CALENDAR_REMINDERS_EVENT, syncLearner);
    window.addEventListener(ORG_CALENDAR_REMINDERS_EVENT, syncOrg);
    return () => {
      window.removeEventListener(LEARNER_CALENDAR_REMINDERS_EVENT, syncLearner);
      window.removeEventListener(ORG_CALENDAR_REMINDERS_EVENT, syncOrg);
    };
  }, []);

  const calendarEvents = useMemo(
    () =>
      mergeCalendarEvents(
        buildTutorLedCalendarEvents(tutorLedEnrollments, tutorLedPrograms),
        buildAdminReminderEvents(adminCalendarReminders),
        isOrg ? buildOrgUserReminderEvents(orgReminders) : buildUserReminderEvents(userReminders),
      ),
    [tutorLedEnrollments, tutorLedPrograms, adminCalendarReminders, userReminders, orgReminders, isOrg],
  );

  const notifications = useMemo(
    () =>
      buildDashboardNotifications({
        calendarEvents,
        examTasks,
        certificates: certificateAlerts,
        coursesNotStarted,
        now: today,
      }),
    [calendarEvents, examTasks, certificateAlerts, coursesNotStarted, today],
  );

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "all") return notifications;
    return notifications.filter((n) => n.kind === notifFilter);
  }, [notifications, notifFilter]);

  const grid = useMemo(
    () => getCalendarGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const weekDays = useMemo(() => {
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return startOfDay(d);
    });
  }, [selected]);

  const selectedEvents = useMemo(() => eventsOnDay(calendarEvents, selected), [calendarEvents, selected]);

  const upcomingList = useMemo(() => {
    const start = startOfDay(today);
    return calendarEvents.filter((e) => e.date >= start);
  }, [calendarEvents, today]);

  const nextUpcoming = upcomingList[0] ?? null;

  const scheduleLabel = isSameDay(selected, today) ? "Today's schedule" : "Day schedule";
  const selectedMonthShort = selected.toLocaleDateString("en-US", { month: "short" });

  const handleAddReminder = (e: FormEvent) => {
    e.preventDefault();
    if (isOrg) {
      const addedByName = orgAddedByName.trim();
      const methodTitle = orgMethodTitle.trim();
      if (!addedByName) {
        setReminderError("Enter your name.");
        return;
      }
      if (!methodTitle) {
        setReminderError("Enter a method / notification title.");
        return;
      }
      try {
        addOrgCalendarReminder({
          date: selected,
          addedByName,
          methodTitle,
          symbol: orgSymbol,
        });
        setOrgMethodTitle("");
        setReminderError(null);
        setOrgReminders(readOrgCalendarReminders());
      } catch {
        setReminderError("Could not save team notification.");
      }
      return;
    }

    const title = newReminderTitle.trim();
    if (!title) {
      setReminderError("Enter a reminder title.");
      return;
    }
    try {
      addLearnerCalendarReminder({ date: selected, title });
      setNewReminderTitle("");
      setReminderError(null);
      setUserReminders(readLearnerCalendarReminders());
    } catch {
      setReminderError("Could not save reminder.");
    }
  };

  const handleRemoveReminder = (eventId: string) => {
    if (isOrgUserReminderEvent(eventId)) {
      const rid = orgUserReminderIdFromEvent(eventId);
      if (!rid) return;
      removeOrgCalendarReminder(rid);
      setOrgReminders(readOrgCalendarReminders());
      return;
    }
    const rid = userReminderIdFromEvent(eventId);
    if (!rid) return;
    removeLearnerCalendarReminder(rid);
    setUserReminders(readLearnerCalendarReminders());
  };

  const goToday = () => {
    const now = startOfDay(today);
    setSelected(now);
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const shiftMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  return (
    <div className={showPageHeader ? "" : "mt-4"}>
      {showPageHeader ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="my-learning-calendar-title text-3xl font-bold tracking-tight text-white">My Calendar</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Stay on track with your live sessions, exams, and important reminders.
            </p>
          </div>
          <Link
            href="/my-learning?tab=dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/10 px-3 py-2 text-xs font-semibold text-[#FFC107] transition hover:bg-[#FFC107]/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to dashboard
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* Left — calendar */}
        <article className="my-learning-calendar-shell rounded-2xl border border-[#FFC107]/25 bg-gradient-to-br from-[#14120a] via-[#0c0c0c] to-black p-4 shadow-[0_0_40px_rgba(255,193,7,0.06)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <h2 className="my-learning-calendar-heading inline-flex items-center gap-2 text-lg font-bold text-white">
              <CalendarDays className="h-5 w-5 text-[#FFC107]" aria-hidden />
              {isOrg ? "Team calendar" : "My calendar"}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/10 px-3 py-1.5 text-xs font-semibold text-[#FFC107] hover:bg-[#FFC107]/20"
              >
                Today
              </button>
              <div className="flex items-center rounded-lg border border-white/10 bg-black/40">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="p-2 text-zinc-400 hover:text-white"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="my-learning-calendar-month min-w-[110px] px-2 text-center text-sm font-semibold text-white">
                  {formatMonthYear(viewDate.getFullYear(), viewDate.getMonth())}
                </span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="p-2 text-zinc-400 hover:text-white"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
                {(["month", "week", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-[11px] font-semibold capitalize ${
                      viewMode === mode
                        ? "bg-[#FFC107] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-zinc-400">
            {LEGEND.map(({ kind, label }) => (
              <span key={kind} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${eventKindColor(kind)}`} aria-hidden />
                {label}
              </span>
            ))}
          </div>

          {viewMode === "month" ? (
            <>
              <div className="my-learning-calendar-weekdays mt-4 grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="py-2">
                    {d}
                  </span>
                ))}
              </div>
              <div className="my-learning-calendar-grid grid grid-cols-7 gap-px rounded-xl border border-white/10 bg-white/5 p-1">
                {grid.map((cell, i) => {
                  if (!cell.date || cell.day == null) {
                    return <span key={`empty-${i}`} className="my-learning-calendar-empty min-h-[64px] bg-black/40" aria-hidden />;
                  }
                  const dayEvents = eventsOnDay(calendarEvents, cell.date);
                  const isToday = isSameDay(cell.date, today);
                  const isSelected = isSameDay(cell.date, selected);
                  const primaryKind = primaryEventKindOnDay(dayEvents);
                  const cellLabel = primaryDayCellLabel(dayEvents);

                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      onClick={() => setSelected(startOfDay(cell.date!))}
                      className={`my-learning-calendar-day relative flex min-h-[64px] flex-col items-center justify-start rounded-lg px-0.5 pt-1.5 text-sm font-medium transition ${
                        isSelected
                          ? `my-learning-calendar-day--selected bg-[#FFC107]/15 text-[#FFC107] ring-2 ${primaryKind ? eventKindRing(primaryKind) : "ring-[#FFC107]/60"}`
                          : isToday
                            ? "my-learning-calendar-day--today bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/50"
                            : "my-learning-calendar-day--default bg-black/50 text-zinc-200 hover:bg-white/5"
                      }`}
                    >
                      <span className="my-learning-calendar-day-num leading-none">{cell.day}</span>
                      {cellLabel ? (
                        <span
                          className={`mt-0.5 max-w-full truncate px-0.5 text-[9px] font-medium leading-tight ${
                            dayEvents.some((e) => e.kind === "reminder")
                              ? "text-emerald-300/95"
                              : "text-zinc-400"
                          }`}
                          title={cellLabel}
                        >
                          {cellLabel}
                        </span>
                      ) : null}
                      {dayEvents.length > 0 ? (
                        <span className="mt-auto flex gap-0.5 pb-1">
                          {dayEvents.slice(0, 4).map((ev) => (
                            <span
                              key={ev.id}
                              className={`h-1.5 w-1.5 rounded-full ${eventKindColor(ev.kind)}`}
                              aria-hidden
                            />
                          ))}
                        </span>
                      ) : (
                        <span className="pb-1" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {viewMode === "week" ? (
            <div className="mt-4 grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const dayEvents = eventsOnDay(calendarEvents, d);
                const isSelected = isSameDay(d, selected);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={`my-learning-calendar-week-day rounded-xl border p-2 text-left ${
                      isSelected
                        ? "border-[#FFC107]/50 bg-[#FFC107]/10"
                        : "border-white/10 bg-black/40"
                    }`}
                  >
                    <p className="text-[10px] text-zinc-500">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className="my-learning-calendar-week-day-num text-lg font-bold">{d.getDate()}</p>
                    <p className="mt-1 text-[10px] text-zinc-400">{dayEvents.length} event(s)</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "list" ? (
            <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
              {upcomingList.length === 0 ? (
                <li className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
                  No upcoming events scheduled.
                </li>
              ) : (
                upcomingList.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href={ev.href}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 hover:border-[#FFC107]/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{ev.title}</p>
                        <p className="text-[10px] text-zinc-500">{ev.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-400">{formatShortDate(ev.date)}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-4">
              <div
                className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl border border-[#FFC107]/35 bg-[#FFC107]/10 shadow-[0_0_20px_rgba(255,193,7,0.12)]"
                aria-hidden
              >
                <span className="text-3xl font-bold leading-none text-[#FFC107]">{selected.getDate()}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {selectedMonthShort}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">{formatCalendarDayHeading(selected)}</p>
                {isSameDay(selected, today) ? (
                  <span className="mt-1.5 inline-flex rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-200">
                    Today
                  </span>
                ) : null}
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm font-semibold text-white">{scheduleLabel}</p>
              {selectedEvents.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-5 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-zinc-600" aria-hidden />
                  <p className="mt-2 text-sm text-zinc-400">
                    {isOrg
                      ? "No team sessions on this date — add a team notification below."
                      : "No sessions on this date — add a personal reminder below."}
                  </p>
                  {nextUpcoming && !isSameDay(nextUpcoming.date, selected) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(startOfDay(nextUpcoming.date));
                        setViewDate(new Date(nextUpcoming.date.getFullYear(), nextUpcoming.date.getMonth(), 1));
                      }}
                      className="mt-3 w-full rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/10 px-3 py-2.5 text-left text-xs transition hover:bg-[#FFC107]/15"
                    >
                      <span className="font-semibold text-[#FFC107]">Next up · {formatShortDate(nextUpcoming.date)}</span>
                      <span className="mt-0.5 block truncate text-zinc-400">{nextUpcoming.title}</span>
                    </button>
                  ) : (
                    <Link
                      href="/my-learning?tab=live"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFC107] hover:underline"
                    >
                      <Compass className="h-3.5 w-3.5" aria-hidden />
                      Explore tutor-led programs
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {selectedEvents.map((ev) => {
                    const program = tutorLedPrograms.find((p) => ev.id.includes(p.slug));
                    const time =
                      program?.schedule && ev.kind === "live"
                        ? extractScheduleTime(program.schedule)
                        : null;
                    const kindLabel =
                      ev.kind === "live"
                        ? "Live session"
                        : ev.kind === "exam"
                          ? "Exam"
                          : ev.kind === "certificate"
                            ? "Certificate"
                            : isOrgUserReminderEvent(ev.id)
                              ? "Team notification"
                              : isUserReminderEvent(ev.id)
                                ? "Your reminder"
                                : "Reminder";
                    const EventSymbol = ev.symbol ? symbolIcon(ev.symbol) : null;

                    return (
                      <li
                        key={ev.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/50 p-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          {EventSymbol ? (
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                              <EventSymbol className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          ) : (
                            <span
                              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${eventKindColor(ev.kind)}`}
                              aria-hidden
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{kindLabel}</p>
                            {time ? <p className="text-xs font-semibold text-[#FFC107]">{time}</p> : null}
                            <p className="text-sm font-medium text-white">{ev.title}</p>
                            {ev.subtitle ? (
                              <p className="mt-0.5 truncate text-[11px] text-zinc-400">{ev.subtitle}</p>
                            ) : null}
                          </div>
                        </div>
                        {isCustomReminderEvent(ev.id) ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveReminder(ev.id)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-500/35 px-3 py-2 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Remove
                          </button>
                        ) : (
                          <Link
                            href={ev.href}
                            className="shrink-0 rounded-lg bg-[#FFC107] px-3 py-2 text-[11px] font-bold text-black hover:bg-[#FFD54F]"
                          >
                            {ev.kind === "live"
                              ? "Join session"
                              : ev.kind === "exam"
                                ? "Start exam"
                                : "Open"}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <form
                onSubmit={handleAddReminder}
                className="mt-4 border-t border-white/10 pt-4"
              >
                <p className="text-xs font-semibold text-white">
                  {isOrg ? "Add team notification" : "Add personal reminder"}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  For {formatCalendarDayHeading(selected)} — saved on this device only.
                </p>
                {isOrg ? (
                  <div className="mt-2 space-y-2">
                    <input
                      value={orgAddedByName}
                      onChange={(e) => {
                        setOrgAddedByName(e.target.value);
                        if (reminderError) setReminderError(null);
                      }}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                    />
                    <input
                      value={orgMethodTitle}
                      onChange={(e) => {
                        setOrgMethodTitle(e.target.value);
                        if (reminderError) setReminderError(null);
                      }}
                      placeholder="Method / notification title (e.g. Zoom check-in)"
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                    />
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Symbol
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ORG_CALENDAR_SYMBOL_OPTIONS.map((opt) => {
                          const Icon = symbolIcon(opt.id);
                          const active = orgSymbol === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              title={opt.label}
                              onClick={() => setOrgSymbol(opt.id)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                                active
                                  ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                                  : "border border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-4 py-2.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add notification
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={newReminderTitle}
                      onChange={(e) => {
                        setNewReminderTitle(e.target.value);
                        if (reminderError) setReminderError(null);
                      }}
                      placeholder="e.g. Review module 2 notes"
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add
                    </button>
                  </div>
                )}
                {reminderError ? (
                  <p className="mt-1.5 text-[10px] text-red-300">{reminderError}</p>
                ) : null}
              </form>
            </div>
          </div>
        </article>

        {/* Right — notifications + help */}
        <div className="flex flex-col gap-4">
          <article className="my-learning-calendar-side rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="my-learning-calendar-heading inline-flex items-center gap-2 text-lg font-bold text-white">
                <Bell className="h-5 w-5 text-[#FFC107]" aria-hidden />
                Notifications
              </h2>
              <Link href="/my-learning?tab=dashboard" className="text-[11px] font-semibold text-[#FFC107] hover:underline">
                View all
              </Link>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isOrg ? "Team sessions, exams, and custom notifications" : "Live sessions, exams, and certificates"}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All"],
                  ["live", "Live sessions"],
                  ["exam", "Exams"],
                  ["certificate", "Certificates"],
                  ["reminder", "Reminders"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNotifFilter(id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    notifFilter === id
                      ? "bg-[#FFC107]/20 text-[#FFC107]"
                      : "border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-0.5">
              {filteredNotifications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-xs text-zinc-500">
                  No notifications in this category.
                </p>
              ) : (
                filteredNotifications.map((n) => {
                  const Icon = notificationIcon(n.kind, n.symbol);
                  const iconBg =
                    n.tone === "violet"
                      ? "bg-violet-500/15 text-violet-300"
                      : n.tone === "amber"
                        ? "bg-[#FFC107]/15 text-[#FFC107]"
                        : n.tone === "sky"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-emerald-500/15 text-emerald-300";
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-2.5 transition hover:border-[#FFC107]/25"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-zinc-500">{n.timeLabel}</span>
                        </span>
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{n.body}</p>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </article>

          <article className="my-learning-calendar-help rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-black/40 to-black p-4">
            <h2 className="my-learning-calendar-heading inline-flex items-center gap-2 text-lg font-bold text-white">
              <HelpCircle className="h-5 w-5 text-violet-300" aria-hidden />
              Need help?
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Support for Zoom, exams, certificates, and course access.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { href: "/contact", label: "Contact support", desc: "Email our team", icon: Mail },
                { href: "/faq", label: "FAQ", desc: "Common questions", icon: FileQuestion },
                {
                  href: "/my-learning?tab=community",
                  label: "Community",
                  desc: "Ask trainers & peers",
                  icon: MessageSquare,
                },
                {
                  href: "/my-learning?tab=live",
                  label: "Tutor-led help",
                  desc: "Zoom & live sessions",
                  icon: Video,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-violet-400/35 hover:bg-violet-500/10"
                >
                  <item.icon className="h-4 w-4 text-violet-300" aria-hidden />
                  <p className="mt-2 text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[10px] text-zinc-500">{item.desc}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-black/25 p-2.5 text-[10px] leading-relaxed text-zinc-500">
              <Headphones className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
              For exam issues, include your course name and module when you contact support.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
