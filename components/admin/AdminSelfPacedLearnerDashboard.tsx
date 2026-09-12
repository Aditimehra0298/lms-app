"use client";

import Link from "next/link";
import { ExternalLink, LayoutDashboard, Shield } from "lucide-react";
import SelfPacedLearnerLmsDashboard from "@/components/SelfPacedLearnerLmsDashboard";
import type { CourseCurriculumModule, ManagedCourseLearningSection } from "@/lib/content-schema";

type Props = {
  title: string;
  slug: string | null;
  modules: CourseCurriculumModule[];
  learning?: ManagedCourseLearningSection;
  onPickCourse?: () => void;
};

/**
 * Admin wrapper only. Change the LMS layout in `components/SelfPacedLearnerLmsDashboard.tsx`.
 */
export default function AdminSelfPacedLearnerDashboard({
  title,
  slug,
  modules,
  learning,
  onPickCourse,
}: Props) {
  const learnerHref = slug ? `/my-learning/course/${slug}` : "";

  if (!slug) {
    return (
      <section className="rounded-2xl border border-violet-500/25 bg-[#0b1224] p-8 text-center">
        <LayoutDashboard className="mx-auto h-8 w-8 text-violet-300" aria-hidden />
        <h2 className="mt-3 text-lg font-bold text-white">Self-paced LMS dashboard</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
          Pick a self-paced course first. This admin view is a copy of the learner LMS after enrollment.
        </p>
        {onPickCourse ? (
          <button
            type="button"
            onClick={onPickCourse}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
          >
            Choose a course
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-600/15 to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-violet-500/15">
            <Shield className="h-5 w-5 text-violet-200" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Admin dashboard</p>
            <h2 className="text-sm font-semibold text-white">Self-paced LMS copy</h2>
            <p className="mt-0.5 max-w-xl text-[11px] text-gray-400">
              Design this layout in{" "}
              <span className="font-mono text-gray-300">components/SelfPacedLearnerLmsDashboard.tsx</span>. Learners
              still use <span className="font-mono text-gray-300">{learnerHref}</span>.
            </p>
          </div>
        </div>
        <Link
          href={learnerHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/20"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open learner LMS
        </Link>
      </div>

      <SelfPacedLearnerLmsDashboard
        title={title}
        slug={slug}
        modules={modules}
        learning={learning}
        preview
      />
    </div>
  );
}
