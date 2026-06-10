import Image from "next/image";
import Link from "next/link";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";
import { filterPublishedWorkshops, mapProgramToWorkshopCard } from "@/lib/workshop-program";

export const dynamic = "force-dynamic";

export default async function WorkshopsIndexPage() {
  const programs = filterPublishedWorkshops(await getPublishedTutorLedPrograms());
  const workshops = programs.map(mapProgramToWorkshopCard);

  return (
    <div className="min-h-screen bg-[#060b16] text-white">
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Live workshops</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">One-day expert sessions</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Same rich landing experience as tutor-led programs — compressed into a single live day. Register from any
          course category; your workshop appears on My Learning calendar after checkout.
        </p>

        {workshops.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-gray-500">
            No workshops published yet. Admin → Tutor Led → set program kind to <strong className="text-gray-300">Workshop</strong>.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workshops.map((w) => (
              <article
                key={w.slug}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f]"
              >
                <div className="relative aspect-[16/9]">
                  <Image src={w.image} alt="" fill unoptimized className="object-cover" />
                  <span className="absolute left-3 top-3 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    1 day
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-sm font-bold leading-snug">{w.title}</h2>
                  <p className="mt-2 text-xs text-gray-500">{w.date}</p>
                  <p className="mt-1 text-xs text-gray-400">Instructor · {w.instructor}</p>
                  <Link
                    href={w.registerHref}
                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    Register
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-gray-500">
          <Link href="/courses" className="text-amber-300 hover:text-amber-200">
            ← Browse all courses
          </Link>
        </p>
      </main>
    </div>
  );
}
