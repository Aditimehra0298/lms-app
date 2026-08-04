"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Compass, GraduationCap, MonitorPlay, BookOpen } from "lucide-react";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { catalogCourseLandingHref } from "@/lib/course-landing";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import type { ManagedCategory, ManagedCourse } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

type Props = {
  isLight: boolean;
};

function isSelfPaced(course: ManagedCourse) {
  return !course.learningFormat || course.learningFormat === "self-paced";
}

function isTutorLedCatalog(course: ManagedCourse) {
  return course.learningFormat === "live" || course.learningFormat === "interactive";
}

function programMatchesDomain(program: TutorLedProgramStored, category: ManagedCategory) {
  const hay = `${program.title} ${program.subtitle} ${program.badge} ${(program.breadcrumb ?? []).join(" ")}`.toLowerCase();
  const titleWords = category.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const slugWords = category.slug.toLowerCase().split("-").filter((w) => w.length > 3);
  const keys = Array.from(new Set([...titleWords, ...slugWords]));
  if (keys.length === 0) return false;
  return keys.some((k) => hay.includes(k));
}

export default function HeaderExploreMenu({ isLight }: Props) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [programs, setPrograms] = useState<TutorLedProgramStored[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const loadCatalog = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    try {
      const [catRes, courseRes, tutorRes] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/tutor-led/programs", { cache: "no-store" }),
      ]);
      const catJson = catRes.ok ? ((await catRes.json()) as { categories?: ManagedCategory[] }) : {};
      const courseJson = courseRes.ok ? ((await courseRes.json()) as { courses?: ManagedCourse[] }) : {};
      const tutorJson = tutorRes.ok
        ? ((await tutorRes.json()) as { programs?: TutorLedProgramStored[] })
        : {};

      const activeCats = (catJson.categories ?? []).filter((c) => c.isActive !== false);
      const publishedCourses = (courseJson.courses ?? []).filter((c) => c.published !== false);
      const publishedPrograms = (tutorJson.programs ?? []).filter(
        (p) => p.published && p.programKind !== "workshop",
      );

      setCategories(activeCats);
      setCourses(publishedCourses);
      setPrograms(publishedPrograms);
      setActiveSlug((prev) => prev || activeCats[0]?.slug || "");
      loadedRef.current = true;
    } catch {
      /* keep empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadCatalog();
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === activeSlug) ?? categories[0] ?? null,
    [categories, activeSlug],
  );

  const domainCourses = useMemo(() => {
    if (!activeCategory) return { selfPaced: [] as ManagedCourse[], tutorCatalog: [] as ManagedCourse[] };
    const key = canonicalCategorySlug(activeCategory.slug);
    const inDomain = courses.filter((c) => canonicalCategorySlug(c.category) === key);
    return {
      selfPaced: inDomain.filter(isSelfPaced),
      tutorCatalog: inDomain.filter(isTutorLedCatalog),
    };
  }, [courses, activeCategory]);

  const domainTutorPrograms = useMemo(() => {
    if (!activeCategory) return [] as TutorLedProgramStored[];
    const matched = programs.filter((p) => programMatchesDomain(p, activeCategory));
    return matched.length > 0 ? matched : programs.slice(0, 6);
  }, [programs, activeCategory]);

  const tutorLedSlugSet = useMemo(() => new Set(programs.map((p) => p.slug)), [programs]);

  const panelClass = isLight
    ? "border-[#b4965a]/45 bg-[#f8f4ec] text-slate-900 shadow-[0_20px_50px_rgba(120,90,30,0.2)]"
    : "border-amber-500/35 bg-[#0c1018] text-white shadow-[0_24px_60px_rgba(0,0,0,0.55)]";
  const sideClass = isLight
    ? "border-[#b4965a]/30 bg-[#efe7da]/80"
    : "border-amber-500/20 bg-black/35";
  const activeDomainClass = isLight
    ? "bg-amber-200/50 text-[#6a4a0c]"
    : "bg-amber-500/20 text-amber-100";
  const idleDomainClass = isLight
    ? "text-slate-700 hover:bg-amber-100/50"
    : "text-gray-300 hover:bg-white/5";
  const linkClass = isLight
    ? "text-slate-800 hover:bg-amber-100/60 hover:text-[#6a4a0c]"
    : "text-gray-200 hover:bg-amber-500/10 hover:text-amber-100";
  const muted = isLight ? "text-slate-500" : "text-gray-500";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[13px] font-bold transition-all ${
          open
            ? isLight
              ? "border-[#9a7222] bg-amber-200/55 text-[#6a4a0c]"
              : "border-amber-400/70 bg-amber-500/20 text-amber-100"
            : isLight
              ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-800 hover:border-[#9a7222] hover:text-[#6a4a0c]"
              : "border-amber-500/40 bg-black/40 text-amber-100 hover:border-amber-400/70 hover:bg-amber-500/10"
        }`}
      >
        <Compass size={15} />
        Explore
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className={`absolute left-0 top-[calc(100%+10px)] z-[120] w-[min(96vw,860px)] overflow-hidden rounded-2xl border max-md:fixed max-md:inset-x-3 max-md:top-28 max-md:w-auto ${panelClass}`}
          role="dialog"
          aria-label="Explore courses by domain"
        >
          <div className="grid max-h-[min(75vh,580px)] grid-cols-1 md:grid-cols-[minmax(260px,0.95fr)_1.25fr]">
            <aside className={`border-b md:border-b-0 md:border-r ${sideClass}`}>
              <p className={`px-4 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] ${muted}`}>
                Domains
              </p>
              <div className="max-h-[220px] space-y-0.5 overflow-y-auto px-2 pb-3 md:max-h-[520px]">
                {loading && categories.length === 0 ? (
                  <p className={`px-2 py-3 text-xs ${muted}`}>Loading domains…</p>
                ) : null}
                {!loading && categories.length === 0 ? (
                  <p className={`px-2 py-3 text-xs ${muted}`}>No domains in admin yet.</p>
                ) : null}
                {categories.map((cat) => {
                  const active = (activeCategory?.slug ?? "") === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onMouseEnter={() => setActiveSlug(cat.slug)}
                      onFocus={() => setActiveSlug(cat.slug)}
                      onClick={() => setActiveSlug(cat.slug)}
                      className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold leading-snug transition ${
                        active ? activeDomainClass : idleDomainClass
                      }`}
                    >
                      <span className="min-w-0 flex-1 whitespace-normal break-words">{cat.title}</span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 opacity-70" />
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="overflow-y-auto p-4">
              {activeCategory ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${muted}`}>
                        Domain
                      </p>
                      <h3 className="text-base font-extrabold leading-snug whitespace-normal break-words">
                        {activeCategory.title}
                      </h3>
                    </div>
                    <Link
                      href={`/courses/category/${activeCategory.slug}`}
                      onClick={() => setOpen(false)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
                        isLight
                          ? "border-[#b4965a]/45 text-[#6a4a0c] hover:bg-amber-100/50"
                          : "border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                      }`}
                    >
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>

                  <section className="mb-5">
                    <div className="mb-2 flex items-center gap-2">
                      <BookOpen size={14} className={isLight ? "text-[#8a6412]" : "text-amber-300"} />
                      <h4 className="text-sm font-bold">Self-paced courses</h4>
                    </div>
                    {domainCourses.selfPaced.length === 0 ? (
                      <p className={`text-xs ${muted}`}>No self-paced courses in this domain yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {domainCourses.selfPaced.slice(0, 8).map((course) => (
                          <li key={course.slug}>
                            <Link
                              href={catalogCourseLandingHref(
                                course.slug,
                                tutorLedSlugSet,
                                course.learningFormat,
                              )}
                              onClick={() => setOpen(false)}
                              className={`block whitespace-normal break-words rounded-lg px-2.5 py-2 text-sm leading-snug transition ${linkClass}`}
                            >
                              {course.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <MonitorPlay
                        size={14}
                        className={isLight ? "text-[#8a6412]" : "text-amber-300"}
                      />
                      <h4 className="text-sm font-bold">Tutor-led courses</h4>
                    </div>
                    {domainCourses.tutorCatalog.length === 0 && domainTutorPrograms.length === 0 ? (
                      <p className={`text-xs ${muted}`}>No tutor-led courses in this domain yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {domainCourses.tutorCatalog.slice(0, 6).map((course) => (
                          <li key={`cat-${course.slug}`}>
                            <Link
                              href={catalogCourseLandingHref(
                                course.slug,
                                tutorLedSlugSet,
                                course.learningFormat,
                              )}
                              onClick={() => setOpen(false)}
                              className={`block whitespace-normal break-words rounded-lg px-2.5 py-2 text-sm leading-snug transition ${linkClass}`}
                            >
                              {course.title}
                            </Link>
                          </li>
                        ))}
                        {domainTutorPrograms.slice(0, 6).map((program) => (
                          <li key={`tl-${program.slug}`}>
                            <Link
                              href={liveTutorCourseHref(program.slug)}
                              onClick={() => setOpen(false)}
                              className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm leading-snug transition ${linkClass}`}
                            >
                              <GraduationCap size={13} className="mt-0.5 shrink-0 opacity-70" />
                              <span className="min-w-0 whitespace-normal break-words">{program.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : (
                <p className={`text-sm ${muted}`}>
                  {loading ? "Loading courses from admin…" : "Select a domain to explore courses."}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
