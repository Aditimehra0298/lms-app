import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  extractScheduleTime,
  parseFlexibleDate,
  startOfDay,
} from "@/lib/my-learning-dashboard-events";
import {
  addLearnerCalendarReminder,
  readLearnerCalendarReminders,
  toDateKey,
} from "@/lib/learner-calendar-reminders";
import { getProgramTrainingDays, isWorkshopProgram } from "@/lib/workshop-program";
import type { ShopCartItem } from "@/lib/shop-cart";
import { tutorLedProgramBySlug } from "@/lib/shop-cart";

/**
 * After checkout — add Zoom live session days onto the learner calendar
 * (workshops = 1 day; tutor-led = training day 1…N from nextBatchDate).
 */
export function syncLiveTrainingCalendarReminders(
  items: ShopCartItem[],
  programs: TutorLedProgramStored[],
): void {
  if (typeof window === "undefined") return;
  const existing = readLearnerCalendarReminders();

  for (const item of items) {
    const program = tutorLedProgramBySlug(programs, item.slug);
    if (!program) continue;

    const batchDate = parseFlexibleDate(program.nextBatchDate ?? "");
    if (!batchDate) continue;

    const workshop = isWorkshopProgram(program);
    const days = workshop ? 1 : getProgramTrainingDays(program);
    const scheduleNote =
      extractScheduleTime(program.schedule || "") ||
      program.schedule?.trim() ||
      "Live on Zoom";

    for (let i = 0; i < days; i++) {
      const date = startOfDay(new Date(batchDate));
      date.setDate(batchDate.getDate() + i);
      const title = workshop
        ? `Workshop: ${program.title}`
        : `Day ${i + 1} — ${program.title}`;
      const note = workshop
        ? `${scheduleNote} · one-day Zoom workshop`
        : `${scheduleNote} · Zoom live training`;
      const dateKey = toDateKey(date);
      const dup = existing.some((r) => r.date === dateKey && r.title === title);
      if (dup) continue;
      addLearnerCalendarReminder({ date, title, note });
      existing.push({ id: "", date: dateKey, title, note, createdAt: "" });
    }
  }
}

/** @deprecated Prefer {@link syncLiveTrainingCalendarReminders} (covers workshops + tutor-led). */
export function syncWorkshopCalendarReminders(
  items: ShopCartItem[],
  programs: TutorLedProgramStored[],
): void {
  syncLiveTrainingCalendarReminders(items, programs);
}
