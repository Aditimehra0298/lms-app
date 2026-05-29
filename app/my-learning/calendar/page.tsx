import Link from "next/link";
import { EnrolledTutorLedOnCalendar } from "@/components/EnrolledTutorLedOnCalendar";

export default function MyLearningCalendarPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <EnrolledTutorLedOnCalendar />
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-6">
          <h1 className="text-3xl font-bold">My Calendar</h1>
          <p className="mt-1 text-sm text-gray-300">
            Live classes, assignment due dates, and tutor-led sessions from your enrollments appear here.
          </p>
          <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
            No scheduled events yet. Enroll in a tutor-led program or complete course modules to build
            your schedule.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/my-learning?tab=live"
              className="rounded-md border border-white/15 px-4 py-2 text-sm text-amber-200 hover:bg-white/5"
            >
              Tutor-led programs
            </Link>
            <Link
              href="/my-learning?tab=assignments"
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
            >
              View assignments
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
