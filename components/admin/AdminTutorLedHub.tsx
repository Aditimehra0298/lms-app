"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, LayoutTemplate, Radio, CalendarDays } from "lucide-react";
import AdminTutorLedCatalogPageEditor from "@/components/admin/AdminTutorLedCatalogPageEditor";
import AdminTutorLedWorkspace from "@/components/admin/AdminTutorLedWorkspace";

type HubTab = "landing" | "programs";

type Props = {
  /** Which tab to open first (from ?panel= or deep links). */
  initialTab?: HubTab;
};

/**
 * Single Tutor Led admin: new ISO catalog landing + Zoom program rows.
 * Replaces the old “open Tutor Led → only cyber Live course admin” path.
 */
export default function AdminTutorLedHub({ initialTab = "landing" }: Props) {
  const [tab, setTab] = useState<HubTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-[#1a1408] to-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Tutor-led · ISO catalog
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">Tutor Led admin</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Edit the public <code className="text-amber-200">/tutor-led</code> page here, then manage each live
              Zoom program (price, schedule, students, certificates) under Programs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tutor-led"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-200 hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Preview /tutor-led
            </Link>
            <Link
              href="/admin?panel=batches"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/20"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Batches & Zoom
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setTab("landing")}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
              tab === "landing"
                ? "bg-[#FFB800] text-black"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Landing page
          </button>
          <button
            type="button"
            onClick={() => setTab("programs")}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
              tab === "programs"
                ? "bg-[#FFB800] text-black"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            Live Zoom programs
          </button>
        </div>
      </div>

      {tab === "landing" ? <AdminTutorLedCatalogPageEditor /> : <AdminTutorLedWorkspace />}
    </div>
  );
}
