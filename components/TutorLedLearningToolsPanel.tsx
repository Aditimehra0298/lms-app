"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, NotebookPen, Presentation } from "lucide-react";
import type { AdminContent } from "@/lib/content-schema";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import {
  groupLearningMaterialsByKind,
  TUTOR_LED_TOOL_META,
  type TutorLedLearningMaterial,
  type TutorLedToolKind,
} from "@/lib/tutor-led-learning-tools";

type Props = {
  programSlug?: string;
  /** Compact layout for My Learning live hub sidebar */
  compact?: boolean;
  /** `neutral` matches My Learning cards; default keeps gold marketing styling */
  tone?: "gold" | "neutral";
};

const TOOL_ICONS: Record<TutorLedToolKind, typeof NotebookPen> = {
  "pad-notes": NotebookPen,
  ppt: Presentation,
  webbook: BookOpen,
};

const GOLD_ICON =
  "ring-amber-300/70 bg-gradient-to-br from-amber-400/35 to-yellow-500/20 text-amber-100 shadow-[0_0_16px_rgba(255,184,0,0.35)]";

const GOLD_DOWNLOAD =
  "bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_16px_rgba(255,184,0,0.35)] hover:from-amber-200 hover:to-amber-400";

function resolveMaterials(
  programs: AdminContent["tutorLedPrograms"] | undefined,
  programSlug?: string,
): TutorLedLearningMaterial[] {
  const list = programs?.length ? programs : defaultTutorLedPrograms;
  const slug = programSlug?.trim();
  const program = slug ? list.find((p) => p.slug === slug) : list[0];
  return program?.learningMaterials ?? [];
}

export function TutorLedLearningToolsPanel({
  programSlug,
  compact = false,
  tone = "gold",
}: Props) {
  const [materials, setMaterials] = useState<TutorLedLearningMaterial[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) throw new Error("content");
        const data = (await res.json()) as AdminContent;
        if (!cancelled) setMaterials(resolveMaterials(data.tutorLedPrograms, programSlug));
      } catch {
        if (!cancelled) setMaterials(resolveMaterials(undefined, programSlug));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programSlug]);

  const byKind = useMemo(() => groupLearningMaterialsByKind(materials), [materials]);
  const neutral = tone === "neutral";

  if (!hydrated) {
    return (
      <article
        className={`rounded-xl border p-4 ${
          neutral ? "border-white/10 bg-black/30" : "border-amber-400/40 bg-amber-950/20 shadow-[0_0_24px_rgba(255,184,0,0.12)]"
        }`}
      >
        <p className={`text-xs ${neutral ? "text-gray-400" : "text-amber-200/70"}`}>Loading learning materials…</p>
      </article>
    );
  }

  return (
    <article
      className={
        neutral
          ? "rounded-xl border border-white/10 bg-black/30 p-4"
          : "relative overflow-hidden rounded-2xl border border-amber-400/55 bg-gradient-to-br from-amber-500/20 via-[#1a1408] to-zinc-950/90 p-4 shadow-[0_0_40px_rgba(255,184,0,0.22)] ring-1 ring-amber-300/30"
      }
    >
      {!neutral ? (
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/25 blur-2xl"
          aria-hidden
        />
      ) : null}
      <div className={neutral ? undefined : "relative"}>
        <h3 className={`text-sm font-bold ${neutral ? "text-white" : "text-amber-50 drop-shadow-[0_0_12px_rgba(255,184,0,0.4)]"}`}>
          Learning materials
        </h3>
        <p className={`mt-0.5 text-[11px] font-medium ${neutral ? "text-gray-400" : "text-amber-200/80"}`}>
          Pad notes, PPT & webbook — download only
        </p>
      </div>

      <div className={`${neutral ? "mt-3" : "relative mt-3"} space-y-3`}>
        {(["pad-notes", "ppt", "webbook"] as const).map((kind) => {
          const Icon = TOOL_ICONS[kind];
          const meta = TUTOR_LED_TOOL_META[kind];
          const list = byKind[kind];

          return (
            <section
              key={kind}
              className={
                neutral
                  ? "rounded-lg border border-white/10 bg-black/20 p-3"
                  : "rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 shadow-[inset_0_0_20px_rgba(255,184,0,0.06)] ring-1 ring-amber-300/20"
              }
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    neutral ? "bg-white/10 text-amber-300" : GOLD_ICON
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${neutral ? "text-white" : "text-amber-50"}`}>{meta.label}</p>
                  {!compact ? (
                    <p className={`truncate text-[10px] ${neutral ? "text-gray-500" : "text-amber-200/70"}`}>
                      {meta.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <ul className="mt-2.5 space-y-1.5">
                {list.length === 0 ? (
                  <li
                    className={`rounded-lg border border-dashed px-2 py-2 text-center text-[10px] ${
                      neutral
                        ? "border-white/15 text-gray-500"
                        : "border-amber-400/30 text-amber-200/60"
                    }`}
                  >
                    No {meta.shortLabel.toLowerCase()} yet
                  </li>
                ) : (
                  list.map((item) => {
                    const hasFile = !!item.downloadUrl?.trim();
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${
                          neutral
                            ? "border-white/10 bg-black/25"
                            : "border-amber-400/25 bg-amber-500/10"
                        }`}
                      >
                        <span className={`min-w-0 flex-1 truncate text-xs ${neutral ? "text-gray-200" : "text-amber-100"}`}>
                          {item.title}
                        </span>
                        {hasFile ? (
                          <a
                            href={item.downloadUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition hover:brightness-110 ${
                              neutral
                                ? "bg-amber-500 text-black hover:bg-amber-400"
                                : GOLD_DOWNLOAD
                            }`}
                          >
                            <Download className="h-3 w-3" aria-hidden />
                            Download
                          </a>
                        ) : (
                          <span className={`shrink-0 text-[10px] ${neutral ? "text-gray-500" : "text-amber-200/50"}`}>
                            Unavailable
                          </span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
