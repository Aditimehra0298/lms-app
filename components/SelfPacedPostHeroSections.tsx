"use client";

import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  MonitorPlay,
  PlayCircle,
  Shield,
  Smartphone,
  Video,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { formatSimpleRichTextBlock } from "@/lib/simple-rich-text";
import type { CourseCurriculumKind } from "@/lib/content-schema";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import {
  getCurriculumForCourse,
  learningOutcomeBullets,
  requirementBullets,
  whatYouLearnGrid,
} from "@/lib/course-detail-template";
import {
  curriculumItemOneLiner,
  curriculumKindPublicLabel,
  curriculumModuleOneLiner,
} from "@/lib/curriculum-landing-copy";
import { instructorInitialLetter } from "@/lib/managed-course-to-post-hero";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";
const card =
  "rounded-2xl border border-emerald-500/15 bg-[#0c1210]/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)_inset] sm:p-6";

const kindMeta: Record<CourseCurriculumKind, { icon: typeof Video; label: string }> = {
  video: { icon: Video, label: "Lecture" },
  reading: { icon: FileText, label: "Document" },
  exam: { icon: ClipboardList, label: "Assessment" },
};

type Props = {
  course: ManagedCourse;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
};

export default function SelfPacedPostHeroSections({ course, openFaq, setOpenFaq }: Props) {
  const modules = getCurriculumForCourse(
    course.slug,
    course.category,
    course.title,
    course.curriculum,
  );
  const outcomes = learningOutcomeBullets(course.title);
  const learnGrid = whatYouLearnGrid(course.title);
  const requirements = requirementBullets(course.category.replace(/-/g, " "));
  const highlights = course.highlights?.length
    ? course.highlights
    : [
        "Structured video lessons you can replay anytime",
        "Readings and downloads in every module",
        "Module quizzes to confirm understanding",
        "Certificate pathway when you complete the program",
      ];
  const faqs =
    course.faqs && course.faqs.length > 0
      ? course.faqs
      : [
          {
            q: "How long do I have access?",
            a: "Study on your own schedule. Access duration is shown at checkout for your enrollment plan.",
          },
          {
            q: "Are there live classes?",
            a: "This is a self-paced program — no fixed live session times. You progress through modules when it suits you.",
          },
          {
            q: "Do I get a certificate?",
            a: "Complete the required modules and assessments to unlock your completion certificate.",
          },
        ];

  const instructor = (course.instructorName ?? "").trim() || "Your instructor";
  const initial = instructorInitialLetter(course);

  return (
    <>
      <section className="border-b border-white/10 bg-[#070707]">
        <div className={`${shell} py-6 md:py-8`}>
          <nav
            className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4"
            aria-label="On this page"
          >
            {[
              { href: "#curriculum", label: "Curriculum" },
              { href: "#outcomes", label: "Outcomes" },
              { href: "#instructor", label: "Instructor" },
              { href: "#faq", label: "FAQ" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-100/90 transition hover:border-emerald-400/50 hover:text-emerald-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <div id="curriculum" className="scroll-mt-24">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Self-paced program
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Course curriculum</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                {modules.length} modules · lectures, documents, and assessments — complete them in order at
                your own pace.
              </p>

              <div className="mt-5 space-y-3">
                {modules.map((mod, mi) => (
                  <details
                    key={`${mod.title}-${mi}`}
                    className="group rounded-xl border border-white/10 bg-black/40 open:border-emerald-500/30"
                    open={mi === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-white marker:content-none">
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-300">
                          {mi + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 block">{mod.title}</span>
                          <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-400">
                            {curriculumModuleOneLiner(mod)}
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        className="mt-1 shrink-0 text-zinc-500 transition group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <ul className="space-y-2 border-t border-white/5 px-4 py-3">
                      {mod.items.map((item, ii) => {
                        const meta = kindMeta[item.kind] ?? kindMeta.video;
                        const Icon = meta.icon;
                        return (
                          <li
                            key={`${item.label}-${ii}`}
                            className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-300"
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p>{item.label}</p>
                              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                {curriculumKindPublicLabel(item.kind)}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-relaxed text-zinc-500">
                                {curriculumItemOneLiner(item)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className={card}>
                <h3 className="text-lg font-bold text-white">How self-paced learning works</h3>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                  {[
                    { icon: PlayCircle, text: "Lectures — watch HD video lessons anytime" },
                    { icon: BookOpen, text: "Documents — download notes and job aids per module" },
                    { icon: ClipboardList, text: "Assessments — pass module checks before moving forward" },
                    { icon: Smartphone, text: "Study on laptop, tablet, or phone" },
                  ].map((row) => (
                    <li key={row.text} className="flex items-start gap-3">
                      <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      {row.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                {(() => {
                  const thumb = resolveCourseListThumbnail(course);
                  if (!thumb) {
                    return (
                      <div className="flex aspect-video w-full items-center justify-center bg-zinc-900" aria-hidden />
                    );
                  }
                  return (
                    <CatalogMediaImage
                      storedSrc={thumb}
                      courseSlug={course.slug}
                      alt=""
                      width={720}
                      height={480}
                      className="h-auto w-full object-cover"
                    />
                  );
                })()}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="outcomes" className="scroll-mt-24 border-b border-white/10 bg-black">
        <div className={`${shell} py-8 md:py-10`}>
          <h2 className="text-xl font-bold text-white md:text-2xl">What you will learn</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {learnGrid.map(([title, desc]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-4"
              >
                <p className="text-sm font-bold text-emerald-200">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-lg font-bold text-white">Learning outcomes</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {outcomes.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-xs text-zinc-300"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#070707]">
        <div className={`${shell} py-8 md:py-10`}>
          <h2 className="text-xl font-bold text-white md:text-2xl">Program highlights</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {highlights.map((line) => (
              <div
                key={line}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-200"
              >
                <MonitorPlay className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="instructor" className="scroll-mt-24 border-b border-white/10 bg-black">
        <div className={`${shell} py-8 md:py-10`}>
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <div className={card}>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-emerald-500/40 bg-zinc-950 text-2xl font-bold text-emerald-300">
                {initial}
              </div>
              <p className="mt-4 text-center text-lg font-bold text-white">{instructor}</p>
              <p className="text-center text-xs text-zinc-500">
                {course.trainerRole?.trim() || "Lead instructor"}
              </p>
              {course.trainerExperience?.trim() ? (
                <p className="mt-2 text-center text-xs text-emerald-200/80">{course.trainerExperience}</p>
              ) : null}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white md:text-2xl">Meet your instructor</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {course.trainerBio?.trim()
                  ? formatSimpleRichTextBlock(course.trainerBio.trim())
                  : course.subtitle}
              </p>
              {course.trainerCertifications && course.trainerCertifications.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.trainerCertifications.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#070707]">
        <div className={`${shell} py-8 md:py-10`}>
          <h2 className="text-xl font-bold text-white md:text-2xl">Requirements</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {requirements.map((req) => (
              <li
                key={req}
                className="flex items-start gap-2 text-xs text-zinc-400"
              >
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                {req}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> {course.duration}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-emerald-400" /> Certificate on completion
            </span>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-b border-white/10 bg-black">
        <div className={`${shell} grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:gap-8 md:py-10`}>
          <div>
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">Frequently asked questions</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-zinc-100"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i ? (
                    <div className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-zinc-400">
                      {faq.a}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="md:pt-2">
            <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-[#0c1812] via-zinc-950 to-black p-6 text-center md:sticky md:top-24">
              <h3 className="text-xl font-extrabold text-white">Ready to start?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Enroll when you are ready and learn on your schedule — no live batch required.
              </p>
              <a
                href="#course-enroll"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition hover:bg-emerald-400"
              >
                Enroll now <ChevronRight size={18} strokeWidth={2.5} />
              </a>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Shield className="h-4 w-4 text-emerald-400" />
                7-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
