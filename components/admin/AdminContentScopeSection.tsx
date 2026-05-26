"use client";

import type { ReactNode } from "react";
import { Copy, Sparkles } from "lucide-react";

export type ContentScope = "common" | "course";

type Props = {
  scope: ContentScope;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Groups admin fields: shared wording vs per-course content. */
export default function AdminContentScopeSection({
  scope,
  title,
  description,
  children,
  className = "",
}: Props) {
  const isCommon = scope === "common";

  return (
    <section
      className={`overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        isCommon
          ? "border-slate-400/25 bg-gradient-to-br from-slate-500/[0.08] via-[#0c1220] to-[#0a0f18]"
          : "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-[#0c1220] to-[#0a0f18]"
      } ${className}`}
    >
      <div
        className={`flex flex-wrap items-center gap-3 border-b px-4 py-3 ${
          isCommon ? "border-slate-400/15 bg-slate-500/[0.06]" : "border-violet-500/15 bg-violet-500/[0.06]"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isCommon
              ? "bg-slate-500/25 text-slate-100 ring-1 ring-slate-400/30"
              : "bg-violet-600/30 text-violet-100 ring-1 ring-violet-400/35"
          }`}
        >
          {isCommon ? (
            <Copy className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          ) : (
            <Sparkles className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          )}
          {isCommon ? "Same for most courses" : "This course only"}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {description ? (
        <p className="border-b border-white/[0.04] px-4 py-2.5 text-[11px] leading-relaxed text-gray-400">
          {description}
        </p>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
