"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Rocket, Sparkles } from "lucide-react";
import { MyLearningFeaturedCourse } from "@/components/MyLearningFeaturedCourse";
import type { LearnerAuthProfile } from "@/lib/auth-profile";
import type { ScoredCourse, FeaturedCoursePick } from "@/lib/learner-course-recommendations";
import type { TutorLedExploreCard } from "@/lib/tutor-led-live-hub-enrich";
import {
  displayOrgRecommendationReason,
  ORG_RECOMMENDED_SECTION_SUBTITLE,
  ORG_RECOMMENDED_SECTION_TITLE,
} from "@/lib/recommendation-display";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";

type TutorRanked = {
  card: TutorLedExploreCard;
  score: number;
  reasons: string[];
};

type Props = {
  profile: LearnerAuthProfile;
  featured: FeaturedCoursePick | null;
  rankedSelfPaced: ScoredCourse[];
  rankedTutorLed: TutorRanked[];
};

const surface =
  "rounded-xl border border-white/[0.07] bg-[#101018] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function CourseThumb({ image, title }: { image?: string; title: string }) {
  if (image?.trim()) {
    return (
      <div className="relative h-24 overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <Image src={image.trim()} alt={title} fill className="object-cover" sizes="200px" />
      </div>
    );
  }
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 text-[10px] text-zinc-500">
      No image
    </div>
  );
}

export function MyLearningOrganizationRecommendations({
  profile,
  featured,
  rankedSelfPaced,
  rankedTutorLed,
}: Props) {
  const topSelfPaced = rankedSelfPaced.slice(0, 4);
  const topTutorLed = rankedTutorLed.slice(0, 2);
  const companyName = profile.companyName?.trim() || "your team";

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        <MyLearningFeaturedCourse
          featured={featured}
          formatReason={(reason) => displayOrgRecommendationReason(reason, companyName)}
        />
        <article className={`flex flex-col justify-center p-5 md:p-6 ${surface}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Team training picks
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Courses matched to {companyName}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Recommendations use your company name, industry, and size — the same signals as individual
            learners. Assign any pick to employees from{" "}
            <Link href="/my-learning?tab=assign-courses" className="text-amber-400/90 hover:underline">
              Assign Courses
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/my-learning?tab=assign-courses"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              <BookOpen size={15} />
              Assign to team
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-300"
            >
              Browse catalog
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-300"
            >
              Profile &amp; recommendations
            </Link>
          </div>
        </article>
      </div>

      <article className={`p-5 md:p-6 ${surface}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="inline-flex items-center gap-2 text-base font-semibold text-white">
              <Compass size={18} className="text-amber-300/90" />
              {ORG_RECOMMENDED_SECTION_TITLE}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">{ORG_RECOMMENDED_SECTION_SUBTITLE}</p>
          </div>
          <Link
            href="/my-learning?tab=assign-courses"
            className="text-xs font-medium text-amber-400/90 transition hover:text-amber-300"
          >
            Assign courses →
          </Link>
        </div>

        {topSelfPaced.length === 0 && topTutorLed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-zinc-500">
            Browse the catalog to find programs for your team.
          </p>
        ) : (
          <div className="space-y-5">
            {topSelfPaced.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Self-paced · top picks
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {topSelfPaced.map(({ course, reasons }) => {
                    const slug = course.slug?.trim() ?? "";
                    const reason = displayOrgRecommendationReason(reasons[0], companyName);
                    return (
                      <article
                        key={`org-rec-sp-${slug}`}
                        className="flex flex-col overflow-hidden rounded-xl border border-violet-500/20 bg-black/25 transition hover:border-amber-400/30"
                      >
                        <div className="relative">
                          <CourseThumb image={course.image} title={course.title} />
                          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md border border-violet-400/40 bg-violet-500/25 px-2 py-0.5 text-[9px] font-bold text-violet-100">
                            <Sparkles size={10} />
                            Recommended
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{course.title}</p>
                          <p className="mt-1 text-[10px] text-violet-200/80">{reason}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {course.duration?.trim() || "Self-paced"}
                          </p>
                          <Link
                            href={`/my-learning?tab=assign-courses`}
                            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
                          >
                            Assign to team
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {topTutorLed.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Tutor-led live · top picks
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {topTutorLed.map(({ card, reasons }) => {
                    const reason = displayOrgRecommendationReason(reasons[0], companyName);
                    return (
                      <article
                        key={`org-rec-tl-${card.slug}`}
                        className="flex flex-col overflow-hidden rounded-xl border border-[#FFC107]/25 bg-black/25 transition hover:border-[#FFC107]/45"
                      >
                        <div className="relative">
                          <CourseThumb image={card.image} title={card.title} />
                          <span className="absolute left-2 top-2 rounded-md bg-[#FFC107] px-2 py-0.5 text-[9px] font-bold uppercase text-black">
                            Tutor led
                          </span>
                          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md border border-violet-400/40 bg-violet-500/25 px-2 py-0.5 text-[9px] font-bold text-violet-100">
                            <Sparkles size={10} />
                            Recommended
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{card.title}</p>
                          <p className="mt-1 text-[10px] text-violet-200/80">{reason}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {card.trainingDays} days · {card.nextBatchDate}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={liveTutorCourseHref(card.slug)}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#FFC107] py-2 text-xs font-bold text-black hover:bg-[#FFD54F]"
                            >
                              View program
                              <Rocket size={14} />
                            </Link>
                            <Link
                              href="/my-learning?tab=assign-courses"
                              className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 py-2 text-xs font-semibold text-amber-200 hover:bg-white/5"
                            >
                              Assign
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}
