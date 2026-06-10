"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { fetchTutorLedProgramsClient, tutorLedProgramBySlug } from "@/lib/shop-cart";
import { isWorkshopProgram } from "@/lib/workshop-program";

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
        purchased
          .filter(
            (p) =>
              (p.deliveryKind === "tutor-led" || p.deliveryKind === "workshop") && p.slug?.trim(),
          )
          .map((p) => p.slug!.trim()),
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
    <section className="mb-5 rounded-2xl border border-[#FFC107]/30 bg-gradient-to-r from-[#2a2210] via-[#1a1508] to-[#0f0d08] p-4 shadow-[inset_0_1px_0_rgba(255,193,7,0.12)]">
      <h2 className="text-base font-bold text-[#FFC107]">Your live enrollments</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Tutor-led and one-day workshops appear on your calendar. Open the program for Zoom links.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map(({ program }) => (
          <li
            key={program.slug}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FFC107]/20 bg-black/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {isWorkshopProgram(program) ? "Workshop · " : ""}
                {program.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {isWorkshopProgram(program) ? "One day · " : "Next batch: "}
                {program.nextBatchDate} · {program.schedule}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/my-learning/course/${encodeURIComponent(program.slug)}`}
                className="rounded-lg bg-[#FFC107] px-4 py-2 text-xs font-bold text-black shadow-[0_4px_16px_rgba(255,193,7,0.3)] hover:bg-[#FFD54F]"
              >
                Open program
              </Link>
              <Link
                href="/my-learning?tab=live"
                className="rounded-lg border border-[#FFC107]/45 bg-transparent px-4 py-2 text-xs font-semibold text-[#FFC107] hover:bg-[#FFC107]/10"
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
