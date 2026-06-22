"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { FeaturedCoursePick } from "@/lib/learner-course-recommendations";
import { displayRecommendationReason } from "@/lib/recommendation-display";

const FALLBACK_BG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80";

type Props = {
  featured: FeaturedCoursePick | null;
  formatReason?: (reason: string | undefined) => string;
};

function splitTitle(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return { lead: title, accent: "" };
  const mid = Math.ceil(words.length / 2);
  return {
    lead: words.slice(0, mid).join(" "),
    accent: words.slice(mid).join(" "),
  };
}

export function MyLearningFeaturedCourse({ featured, formatReason }: Props) {
  const reasonLabel = (reason: string | undefined) =>
    formatReason ? formatReason(reason) : displayRecommendationReason(reason);
  if (!featured) {
    return (
      <article className="my-learning-featured-card relative min-h-[220px] overflow-hidden rounded-xl border border-white/10 p-4 md:min-h-[260px]">
        <Image src={FALLBACK_BG} alt="" fill className="object-cover opacity-40" sizes="(max-width: 768px) 100vw, 50vw" />
        <div className="my-learning-featured-overlay absolute inset-0 bg-linear-to-r from-[#091224] via-[#091224]/85 to-[#091224]/40" />
        <div className="relative z-10">
          <p className="inline-flex rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
            Explore SF Trainings
          </p>
          <h3 className="mt-3 text-3xl font-bold md:text-4xl">
            Find your next <span className="text-amber-300">course</span>
          </h3>
          <p className="mt-2 max-w-md text-sm text-gray-300">
            Browse courses on SF Trainings and enroll to start learning.
          </p>
          <Link
            href="/courses"
            className="mt-4 inline-flex rounded-md border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur-sm"
          >
            Browse catalog
          </Link>
        </div>
      </article>
    );
  }

  const bg = featured.image?.trim() || FALLBACK_BG;
  const { lead, accent } = splitTitle(featured.title);
  const isAi = featured.kind === "recommended";

  return (
    <article className="my-learning-featured-card relative min-h-[220px] overflow-hidden rounded-xl border border-white/10 md:min-h-[260px]">
      <Image
        src={bg}
        alt=""
        fill
        unoptimized={bg.startsWith("http") || bg.startsWith("/uploads")}
        className="object-cover opacity-45"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="my-learning-featured-overlay absolute inset-0 bg-linear-to-r from-[#091224] via-[#091224]/80 to-transparent" />
      <div className="my-learning-featured-overlay-b absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
            {isAi ? "Recommended" : "Featured Course"}
          </p>
          {isAi ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100">
              <Sparkles size={11} />
              {reasonLabel(featured.reason)}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
          {lead}
          {accent ? (
            <>
              {" "}
              <span className="text-amber-300">{accent}</span>
            </>
          ) : null}
        </h3>

        <p className="mt-2 max-w-lg text-sm text-gray-300">
          {featured.modules} modules • {featured.duration}
          {featured.kind === "enrolled" ? ` • ${featured.completed} completed` : ""}
          {!isAi && featured.reason ? ` · ${featured.reason}` : isAi ? ` · ${reasonLabel(featured.reason)}` : ""}
        </p>

        <Link
          href={featured.href}
          className="mt-4 inline-flex w-fit rounded-md border border-white/20 bg-black/45 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-black/60"
        >
          {featured.cta}
        </Link>
      </div>
    </article>
  );
}
