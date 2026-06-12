"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Building2 } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
type Props = {
  courses: ManagedCourse[];
};

export function MyLearningOrganizationCourses({ courses }: Props) {
  const published = courses.filter((c) => c.published !== false && c.settings?.showInCatalog !== false);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
      <div>
        <h1 className="text-4xl font-bold">Team Courses</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-300">
          Browse courses for your organisation. Open a course to enroll your team — you will enter how
          many employees to include and see your team price before checkout.
        </p>
      </div>

      <article className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xl font-bold">
            <BookOpen size={20} className="text-amber-300" />
            Available for your organisation
          </h3>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Building2 size={12} />
            {published.length} courses
          </span>
        </div>

        {published.length === 0 ? (
          <p className="text-sm text-gray-400">No published courses in the catalog yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {published.map((course) => (
              <article
                key={course.slug}
                className="flex flex-col rounded-xl border border-white/10 bg-black/25 p-3"
              >
                {course.image?.trim() ? (
                  <div className="relative h-28 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={course.image.trim()}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-gray-500">
                    No image
                  </div>
                )}
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{course.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-400">{course.subtitle}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {course.duration} · {course.level}
                </p>
                <Link
                  href={`/courses/${encodeURIComponent(course.slug)}`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
                >
                  View course & enroll team
                </Link>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
