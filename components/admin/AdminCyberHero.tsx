"use client";

import type { ReactNode } from "react";
import { Shield } from "lucide-react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  accent?: "cyan" | "emerald" | "violet" | "amber";
  chips?: string[];
  children?: ReactNode;
};

const accents = {
  cyan: {
    border: "border-cyan-400/25",
    from: "from-[#06141c]",
    iconBg: "bg-cyan-500/20 ring-cyan-400/35 shadow-[0_0_32px_rgba(34,211,238,0.22)]",
    icon: "text-cyan-200",
    eyebrow: "text-cyan-300/90",
    grid: "rgba(34,211,238,0.5)",
    chip: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  },
  emerald: {
    border: "border-emerald-400/25",
    from: "from-[#061814]",
    iconBg: "bg-emerald-500/20 ring-emerald-400/35 shadow-[0_0_32px_rgba(16,185,129,0.22)]",
    icon: "text-emerald-200",
    eyebrow: "text-emerald-300/90",
    grid: "rgba(16,185,129,0.5)",
    chip: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  },
  violet: {
    border: "border-violet-400/25",
    from: "from-[#100818]",
    iconBg: "bg-violet-500/20 ring-violet-400/35 shadow-[0_0_32px_rgba(139,92,246,0.22)]",
    icon: "text-violet-200",
    eyebrow: "text-violet-300/90",
    grid: "rgba(167,139,250,0.5)",
    chip: "border-violet-400/20 bg-violet-500/10 text-violet-100",
  },
  amber: {
    border: "border-amber-400/25",
    from: "from-[#16100a]",
    iconBg: "bg-amber-500/20 ring-amber-400/35 shadow-[0_0_32px_rgba(245,158,11,0.22)]",
    icon: "text-amber-200",
    eyebrow: "text-amber-300/90",
    grid: "rgba(251,191,36,0.5)",
    chip: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  },
};

export function AdminCyberHero({
  eyebrow,
  title,
  description,
  accent = "cyan",
  chips = [],
  children,
}: Props) {
  const a = accents[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${a.border} bg-gradient-to-br ${a.from} via-[#0c1428] to-[#070b14]`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(${a.grid} 1px, transparent 1px), linear-gradient(90deg, ${a.grid} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl" aria-hidden />
      <div className="relative border-b border-white/[0.06] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ${a.iconBg}`}>
            <Shield className={`h-6 w-6 ${a.icon}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${a.eyebrow}`}>{eyebrow}</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">{description}</p>
            {chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${a.chip}`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
