"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { fetchTutorLedProgramsClient, tutorLedProgramBySlug } from "@/lib/shop-cart";

type PurchasedRow = { slug?: string; title: string; deliveryKind?: string };

export function EnrolledTutorLedOnCalendar() {
  const [rows, setRows] = useState<{ program: TutorLedProgramStored }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let purchased: PurchasedRow[] = [];
      try {
        const raw = window.localStorage.getItem("sft_purchased_courses");
        if (raw) purchased = JSON.parse(raw) as PurchasedRow[];
      } catch {
        purchased = [];
      }
      const slugs = new Set(
        purchased.filter((p) => p.deliveryKind === "tutor-led" && p.slug?.trim()).map((p) => p.slug!.trim()),
      );
      if (!slugs.size) {
        if (!cancelled) setRows([]);
        return;
      }
      const programs = await fetchTutorLedProgramsClient();
      const out: { program: TutorLedProgramStored }[] = [];
      for (const slug of slugs) {
        const program = tutorLedProgramBySlug(programs, slug);
        if (program) out.push({ program });
      }
      if (!cancelled) setRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows.length) return null;

  return (
    <section className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
      <h2 className="text-lg font-bold text-amber-100">Your tutor-led enrollments</h2>
      <p className="mt-1 text-xs text-gray-300">
        These programs appear on your schedule below. Open the program for Zoom links and materials when available.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map(({ program }) => (
          <li
            key={program.slug}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-white">{program.title}</p>
              <p className="text-xs text-gray-400">
                Next batch: {program.nextBatchDate} · {program.schedule}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/my-learning/course/${encodeURIComponent(program.slug)}`}
                className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-300"
              >
                Open program
              </Link>
              <Link
                href="/my-learning?tab=live"
                className="rounded-md border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10"
              >
                Tutor Led tab
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
