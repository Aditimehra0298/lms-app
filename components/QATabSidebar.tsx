"use client";

import Link from "next/link";
import { Ban, Headphones, MessageCircle, Search, Shield, Target } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { QA_GUIDELINE_ICONS, resolveQACopy } from "@/lib/course-qa-section";

const card = "rounded-xl border border-white/10 bg-[#141414]";

const guidelineIcons = {
  message: MessageCircle,
  search: Search,
  target: Target,
  ban: Ban,
  shield: Shield,
};

type Props = { course: ManagedCourse };

export default function QATabSidebar({ course }: Props) {
  const copy = resolveQACopy(course);

  return (
    <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className={card + " p-5"}>
        <h3 className="text-sm font-bold text-white">{copy.guidelinesTitle}</h3>
        <ul className="mt-4 space-y-3.5">
          {copy.guidelines.map((text, i) => {
            const iconKey = QA_GUIDELINE_ICONS[i % QA_GUIDELINE_ICONS.length]!;
            const Icon = guidelineIcons[iconKey];
            return (
              <li key={text} className="flex items-start gap-3 text-sm text-zinc-300">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                {text}
              </li>
            );
          })}
        </ul>
      </div>

      <div className={card + " p-5"}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600/25">
            <Headphones className="h-5 w-5 text-violet-300" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{copy.needHelpTitle}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{copy.needHelpText}</p>
          </div>
        </div>
        <Link
          href="/#organisation"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-violet-500/50 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/10"
        >
          {copy.contactSupportLabel}
        </Link>
      </div>
    </aside>
  );
}
