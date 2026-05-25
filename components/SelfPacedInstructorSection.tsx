"use client";

import Image from "next/image";
import {
  Award,
  Building2,
  ClipboardList,
  Globe2,
  GraduationCap,
  Shield,
  ShieldCheck,
  Star,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  resolveInstructorSection,
  type ExpertiseCard,
  type InstructorPillar,
} from "@/lib/course-instructor-section";

const panel =
  "rounded-2xl border border-violet-500/20 bg-gradient-to-b from-[#0f1428] via-[#0c1020] to-[#080a14]";

const expertiseIcon: Record<ExpertiseCard["tone"], { icon: typeof Shield; box: string; text: string }> = {
  emerald: { icon: ShieldCheck, box: "bg-emerald-500/15", text: "text-emerald-400" },
  sky: { icon: Globe2, box: "bg-sky-500/15", text: "text-sky-400" },
  orange: { icon: Building2, box: "bg-orange-500/15", text: "text-orange-400" },
  violet: { icon: ClipboardList, box: "bg-violet-500/15", text: "text-violet-400" },
  amber: { icon: UtensilsCrossed, box: "bg-amber-500/15", text: "text-amber-400" },
};

const pillarIcons = [Shield, ClipboardList, Award, GraduationCap];

type Props = { course: ManagedCourse };

function PillarColumn({ pillar, index }: { pillar: InstructorPillar; index: number }) {
  const Icon = pillarIcons[index % pillarIcons.length]!;
  return (
    <div
      className={`flex flex-col px-4 py-2 md:px-5 ${
        index > 0 ? "border-t border-white/10 pt-6 md:border-t-0 md:border-l md:pt-2 md:pl-6" : ""
      }`}
    >
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-violet-600/30 ring-1 ring-violet-400/30">
        <Icon className="h-5 w-5 text-violet-200" aria-hidden />
      </div>
      <h4 className="text-sm font-bold text-white">{pillar.title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{pillar.description}</p>
    </div>
  );
}

export default function SelfPacedInstructorSection({ course }: Props) {
  const data = resolveInstructorSection(course);

  return (
    <div id="sp-instructor" className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
      <div className="min-w-0 space-y-8">
        {/* Hero intro + team illustration */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(220px,1fr)] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold capitalize tracking-tight text-white md:text-3xl lg:text-[2rem] lg:leading-tight">
              {data.headline}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-zinc-300 md:text-[15px] md:leading-7">
              {data.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-violet-500/25 bg-[#0a0d18]">
              <Image
                src={data.teamImage}
                alt={data.teamLabel}
                fill
                className="object-contain object-center p-2"
                unoptimized
                sizes="(max-width: 1024px) 400px, 420px"
                priority
              />
            </div>
          </div>
        </div>

        {/* SFT Expert Team — 4 column grid */}
        <div className={`${panel} p-5 md:p-6`}>
          <div className="mb-6 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600/30">
              <Users className="h-5 w-5 text-violet-300" aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-white">{data.teamLabel}</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.pillars.map((pillar, i) => (
              <PillarColumn key={pillar.title} pillar={pillar} index={i} />
            ))}
          </div>
        </div>

        {/* Our expertise */}
        <div>
          <h3 className="text-xl font-bold text-white">Our expertise</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {data.expertise.map((item) => {
              const meta = expertiseIcon[item.tone];
              const Icon = meta.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#12121a] px-3 py-3"
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${meta.box}`}>
                    <Icon className={`h-5 w-5 ${meta.text}`} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-snug text-white">{item.title}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-violet-500/25 bg-[#0c0f1c] px-5 py-4 sm:flex-row">
          <p className="flex items-start gap-2 text-sm text-zinc-300">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            {data.trustQuote}
          </p>
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2">
            <Award className="h-5 w-5 text-violet-300" aria-hidden />
            <span className="text-xs font-semibold text-violet-200">{data.trustBadge}</span>
          </div>
        </div>
      </div>

      {/* Instructor sidebar grid */}
      <aside className="xl:sticky xl:top-28 xl:self-start">
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <h3 className="text-sm font-bold text-white">Meet the experts</h3>
          <p className="mt-1 text-xs text-zinc-500">Specialists behind this course</p>
          <div className="mt-4 grid gap-3">
            {data.sidebarInstructors.map((person) => (
              <div
                key={person.name}
                className="flex gap-3 rounded-lg border border-white/10 bg-[#0f0f12] p-3 transition hover:border-violet-500/30"
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${person.accent}`}
                >
                  {person.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-white">{person.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{person.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-violet-500/20 bg-[#0a0d18]">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={data.teamImage}
              alt=""
              fill
              className="object-contain p-2 opacity-90"
              unoptimized
              sizes="300px"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
