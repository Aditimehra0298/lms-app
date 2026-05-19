"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLearnerLoggedIn, loginRedirectHref } from "@/lib/learner-session-client";
import { Clock, GraduationCap, Star, Users } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { instructorInitialLetter } from "@/lib/managed-course-to-post-hero";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { CoursePrice } from "@/components/CoursePrice";

function parseMoneyInput(s: string): number | null {
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function discountPercent(saleStr: string, listStr: string): number | null {
  const sale = parseMoneyInput(saleStr);
  const list = parseMoneyInput(listStr);
  if (sale === null || list === null || list <= 0 || sale >= list) return null;
  return Math.round((1 - sale / list) * 100);
}

type Props = { course: ManagedCourse };

export default function SelfPacedCourseHero({ course }: Props) {
  const router = useRouter();
  const { showPrices, ready } = useLearnerPricing();
  const badge = (course.pageBadge ?? "SELF-PACED").trim() || "SELF-PACED";
  const pct = discountPercent(course.price, course.oldPrice);
  const initial = instructorInitialLetter(course);
  const instructor = (course.instructorName ?? "").trim() || "Instructor";

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-black">
      <div className="relative mx-auto w-full max-w-[1760px] px-4 pb-8 pt-4 sm:px-6 md:px-8 xl:px-10">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
          <Link href="/" className="transition hover:text-[#FFB800]">
            Home
          </Link>
          <span className="text-zinc-600">/</span>
          <Link href="/courses" className="transition hover:text-[#FFB800]">
            Courses
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="font-medium text-[#FFB800]">{course.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 xl:items-start">
          <div className="min-w-0 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded border border-[#FFB800]/80 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                {badge}
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                On your schedule
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
              {course.title}
            </h1>
            <p className="mb-6 max-w-[60ch] text-sm leading-relaxed text-zinc-300 sm:text-[15px]">{course.subtitle}</p>

            <div className="mb-6 flex flex-wrap gap-2">
              {[
                { icon: GraduationCap, label: course.level },
                { icon: Clock, label: course.duration },
                { icon: Star, label: `${course.rating} rating` },
                { icon: Users, label: `${course.learners} learners` },
              ].map((row) => (
                <div
                  key={row.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200"
                >
                  <row.icon className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                  {row.label}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#FFB800]/45 bg-zinc-950 text-lg font-bold text-[#FFB800]">
                {initial}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{instructor}</p>
                <p className="text-xs text-zinc-500">Primary instructor for this program</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              <div className="relative aspect-[16/10] w-full bg-zinc-900">
                <Image
                  src={course.image || "/course-food-safety.png"}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
              </div>
            </div>

            <aside className="rounded-2xl border border-[#FFB800]/35 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_0_0_1px_rgba(255,184,0,0.08)] lg:sticky lg:top-24">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Enroll</p>
              {ready && showPrices ? (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <CoursePrice label={course.price} className="text-2xl font-extrabold text-white" />
                  {course.oldPrice ? (
                    <CoursePrice label={course.oldPrice} className="text-sm text-zinc-500 line-through" />
                  ) : null}
                  {pct !== null ? (
                    <span className="rounded bg-[#FFB800]/15 px-2 py-0.5 text-xs font-bold text-[#FFB800]">
                      {pct}% off
                    </span>
                  ) : null}
                </div>
              ) : ready ? (
                <CoursePrice variant="button" className="mt-3" />
              ) : (
                <div className="mt-2 h-10 animate-pulse rounded-lg bg-zinc-800/80" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isLearnerLoggedIn()) {
                    router.push(loginRedirectHref());
                    return;
                  }
                  router.push("/cart");
                }}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#FFB800] py-3 text-sm font-extrabold text-black transition hover:bg-[#e5a500]"
              >
                Add to cart
              </button>
              <p className="mt-3 text-center text-[11px] text-zinc-500">Secure checkout. Access details are confirmed after purchase.</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
