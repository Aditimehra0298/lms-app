import Link from "next/link";
import { EnrolledTutorLedOnCalendar } from "@/components/EnrolledTutorLedOnCalendar";

const rightFilters = [
  "All Events",
  "Live Classes",
  "Assignments",
  "Quiz / Exams",
  "Workshops / Events",
  "Community",
  "Study Plan",
  "Personal",
];
const monthDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthGrid = ["", "", "", "", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

const timeLabels = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM"];

export default function MyLearningCalendarPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <EnrolledTutorLedOnCalendar />
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">My Calendar</h1>
                <p className="text-sm text-gray-300">
                  Your all-in-one schedule for learning, events, and important deadlines.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-white/15 bg-black/25 px-3 py-1.5 text-xs">
                  Today
                </button>
                <button className="rounded-lg border border-white/15 bg-black/25 px-3 py-1.5 text-xs">
                  Week
                </button>
                <button className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold">
                  + Create Event
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Live Classes", "3", "Today"],
                ["Assignments Due", "2", "This Week"],
                ["Upcoming Events", "5", "This Week"],
                ["Study Streak", "12", "Days"],
                ["Total Events", "24", "This Month"],
              ].map(([label, value, hint], idx) => (
                <article
                  key={label}
                  className={`rounded-xl border p-3 ${
                    idx === 4
                      ? "border-violet-300/35 bg-violet-500/15"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <p className="text-xs text-gray-300">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                  <p className="text-xs text-gray-400">{hint}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-2 md:p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="font-semibold">May 19 - May 25, 2025</p>
                <p className="text-xs text-gray-400">GMT +05:30 India Standard Time</p>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[980px] rounded-lg border border-white/10">
                  <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-white/10 text-center text-xs">
                    <div className="border-r border-white/10 py-2 text-gray-500">All Day</div>
                    {["Mon 19", "Tue 20", "Wed 21", "Thu 22", "Fri 23", "Sat 24", "Sun 25"].map((d) => (
                      <div key={d} className="border-r border-white/10 py-2 text-gray-300 last:border-r-0">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="relative grid grid-cols-[64px_repeat(7,minmax(120px,1fr))]">
                    <div className="border-r border-white/10">
                      {timeLabels.map((time) => (
                        <div key={time} className="h-12 border-b border-white/5 px-2 pt-1 text-[11px] text-gray-500">
                          {time}
                        </div>
                      ))}
                    </div>
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <div key={idx} className="relative border-r border-white/10 last:border-r-0">
                        {timeLabels.map((time) => (
                          <div key={time} className="h-12 border-b border-white/5" />
                        ))}
                      </div>
                    ))}

                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-[64px] top-[96px] h-[84px] w-[13%] rounded-md border border-blue-400/50 bg-blue-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Cyber Security Fundamentals</p>
                        <p>9:00 - 10:30 AM</p>
                      </div>
                      <div className="absolute left-[28%] top-[84px] h-[72px] w-[13%] rounded-md border border-violet-400/50 bg-violet-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Webinar: Career in Cyber Security</p>
                        <p>9:00 - 10:30 AM</p>
                      </div>
                      <div className="absolute left-[42%] top-[180px] h-[72px] w-[13%] rounded-md border border-blue-400/50 bg-blue-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Penetration Testing</p>
                        <p>11:00 AM - 12:30 PM</p>
                      </div>
                      <div className="absolute left-[56%] top-[168px] h-[180px] w-[13%] rounded-md border border-amber-400/50 bg-amber-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Workshop: Ethical Hacking with Tools</p>
                        <p>11:00 AM - 2:00 PM</p>
                      </div>
                      <div className="absolute left-[70%] top-[96px] h-[72px] w-[13%] rounded-md border border-rose-400/50 bg-rose-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Quiz: Network Security Basics</p>
                        <p>9:00 - 10:00 AM</p>
                      </div>
                      <div className="absolute left-[70%] top-[336px] h-[96px] w-[13%] rounded-md border border-emerald-400/50 bg-emerald-500/20 p-1.5 text-[10px]">
                        <p className="font-semibold">Threat Analysis Hands-on</p>
                        <p>2:00 - 3:30 PM</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 border-t border-white/10 px-3 py-2 text-[11px] text-gray-400">
                    {[
                      ["Live Class", "bg-blue-400"],
                      ["Assignment", "bg-rose-400"],
                      ["Quiz / Exam", "bg-pink-400"],
                      ["Workshop / Event", "bg-amber-400"],
                      ["Community", "bg-violet-400"],
                      ["Study Plan", "bg-emerald-400"],
                      ["Personal", "bg-gray-300"],
                    ].map(([label, tone]) => (
                      <span key={label} className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${tone}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 border-b border-white/10 text-xs">
                {["Schedule", "My Deadlines", "My Events", "Other Events"].map((tab, idx) => (
                  <button
                    key={tab}
                    className={`rounded-t-md px-3 py-1.5 ${
                      idx === 0
                        ? "border border-b-0 border-white/15 bg-white/10 text-violet-100"
                        : "text-gray-400"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Today, May 21</h3>
                  <Link href="#" className="text-xs text-violet-200">
                    View Day
                  </Link>
                </div>
                <div className="space-y-2">
                  {[
                    "Webinar: Career in Cyber Security",
                    "Assignment Due: Risk Assessment",
                    "Community Event: Ask Me Anything",
                  ].map((item) => (
                    <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Tomorrow, May 22</h3>
                  <Link href="#" className="text-xs text-violet-200">
                    View Day
                  </Link>
                </div>
                <div className="space-y-2">
                  {[
                    "Penetration Testing Tutor-Led Session",
                    "Study Plan: Complete Module 3",
                    "Discussion: Week 3 Doubt Session",
                  ].map((item) => (
                    <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <article className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">May 2025</h3>
                <div className="flex gap-1 text-xs text-gray-400">
                  <button className="rounded border border-white/10 px-1.5 py-0.5">‹</button>
                  <button className="rounded border border-white/10 px-1.5 py-0.5">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {monthDays.map((day) => (
                  <div key={day} className="py-1 text-gray-400">
                    {day}
                  </div>
                ))}
                {monthGrid.map((day, idx) => (
                  <div
                    key={`${day}-${idx}`}
                    className={`rounded-md py-1 ${
                      day === 21
                        ? "bg-violet-500/25 font-semibold text-violet-100"
                        : day
                          ? "text-gray-200 hover:bg-white/10"
                          : "text-transparent"
                    }`}
                  >
                    {day || "."}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0d1526] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                <button className="text-xs text-violet-200">Clear</button>
              </div>
              <div className="space-y-2">
                {rightFilters.map((item) => (
                  <label
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  >
                    <span>{item}</span>
                    <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-violet-500" />
                  </label>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0d1526] p-4">
              <h3 className="font-semibold">Upcoming (Next 7 Days)</h3>
              <div className="mt-3 space-y-2">
                {[
                  "Penetration Testing Tutor-Led Session",
                  "Workshop: Ethical Hacking Tools",
                  "Threat Analysis Hands-on",
                  "Quiz: Network Security Basics",
                ].map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="text-sm">{item}</p>
                    <p className="mt-1 text-xs text-gray-400">Join now</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0d1526] p-4">
              <h3 className="font-semibold">Today&apos;s Agenda</h3>
              <div className="mt-3 space-y-2">
                {[
                  "Webinar: Career in Cyber Security",
                  "Assignment Due: Risk Assessment",
                  "Community Event: Ask Me Anything",
                ].map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="text-sm">{item}</p>
                    <p className="mt-1 text-xs text-gray-400">View details</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-violet-300/20 bg-linear-to-r from-[#1a1240] via-[#120f2b] to-[#1a1446] p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Plan Ahead, Stay Ahead</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Add events, set reminders, and never miss an important class or deadline.
                </p>
              </div>
              <button className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                ×
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-sm font-semibold">Smart Reminders</p>
                <p className="text-xs text-gray-400">Get notified before every event</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-sm font-semibold">One-Click Join</p>
                <p className="text-xs text-gray-400">Join tutor-led sessions instantly</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-sm font-semibold">Sync Everywhere</p>
                <p className="text-xs text-gray-400">Access your calendar anywhere</p>
              </div>
              <button className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
                + Create Event
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
