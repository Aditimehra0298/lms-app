import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { parseFlexibleDate } from "@/lib/my-learning-dashboard-events";
import {
  addLearnerCalendarReminder,
  readLearnerCalendarReminders,
  toDateKey,
} from "@/lib/learner-calendar-reminders";
import { isWorkshopProgram } from "@/lib/workshop-program";
import type { ShopCartItem } from "@/lib/shop-cart";
import { tutorLedProgramBySlug } from "@/lib/shop-cart";

/** After checkout — add a one-day workshop reminder on the learner calendar. */
export function syncWorkshopCalendarReminders(
  items: ShopCartItem[],
  programs: TutorLedProgramStored[],
): void {
  if (typeof window === "undefined") return;
  const existing = readLearnerCalendarReminders();

  for (const item of items) {
    const program = tutorLedProgramBySlug(programs, item.slug);
    if (!program || !isWorkshopProgram(program)) continue;

    const date = parseFlexibleDate(program.nextBatchDate ?? "");
    if (!date) continue;

    const title = `Workshop: ${program.title}`;
    const note = program.schedule?.trim() || "Live on Zoom — one day";
    const dateKey = toDateKey(date);
    const dup = existing.some((r) => r.date === dateKey && r.title === title);
    if (dup) continue;

    addLearnerCalendarReminder({ date, title, note });
    existing.push({ id: "", date: dateKey, title, note, createdAt: "" });
  }
}
