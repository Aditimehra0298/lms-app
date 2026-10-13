import { catalogCourseLandingHref } from "@/lib/course-landing";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export type SiteSearchKind = "course" | "tutor-led" | "workshop" | "category";

export type SiteSearchResult = {
  kind: SiteSearchKind;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  slug?: string;
  category?: string;
  meta?: string;
};

function normalize(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Every query word must appear somewhere; title matches rank highest. */
function score(query: string[], title: string, rest: string): number {
  const t = normalize(title);
  const all = `${t} ${normalize(rest)}`;
  if (!query.every((w) => all.includes(w))) return 0;
  let s = 1;
  const phrase = query.join(" ");
  if (t === phrase) s += 100;
  else if (t.startsWith(phrase)) s += 60;
  else if (t.includes(phrase)) s += 40;
  s += query.filter((w) => t.includes(w)).length * 10;
  return s;
}

export async function searchSite(rawQuery: string, limit = 50): Promise<SiteSearchResult[]> {
  const query = normalize(rawQuery).split(" ").filter(Boolean).slice(0, 8);
  if (query.length === 0) return [];

  const [courses, programs, content] = await Promise.all([
    getManagedCourses().catch(() => []),
    getPublishedTutorLedPrograms().catch(() => []),
    readAdminContent(),
  ]);
  const tutorLedSlugs = new Set(programs.map((p) => p.slug));
  const categoryTitle = new Map(
    (content.categories ?? []).map((c) => [c.slug?.toLowerCase(), c.title || c.slug] as const),
  );
  const scored: { s: number; r: SiteSearchResult }[] = [];

  for (const c of courses) {
    const cat = categoryTitle.get(c.category?.toLowerCase()) ?? c.category ?? "";
    const s = score(query, c.title, `${c.subtitle ?? ""} ${cat} ${c.instructorName ?? ""} ${c.slug} ${(c.highlights ?? []).join(" ")}`);
    if (!s) continue;
    const live = c.learningFormat === "live" || tutorLedSlugs.has(c.slug);
    scored.push({
      s: s + 5,
      r: {
        kind: live ? "tutor-led" : "course",
        title: c.title,
        subtitle: c.subtitle ?? "",
        href: catalogCourseLandingHref(c.slug, tutorLedSlugs, c.learningFormat),
        image: c.image,
        slug: c.slug,
        category: c.category,
        meta: [live ? "Tutor-led" : "Self-paced", cat, c.level, c.duration].filter(Boolean).join(" · "),
      },
    });
  }

  const courseSlugs = new Set(courses.map((c) => c.slug));
  for (const p of programs) {
    if (courseSlugs.has(p.slug)) continue;
    const s = score(query, p.title, `${p.subtitle ?? ""} ${p.badge ?? ""} ${(p.breadcrumb ?? []).join(" ")} ${p.slug}`);
    if (!s) continue;
    const workshop = p.programKind === "workshop";
    scored.push({
      s,
      r: {
        kind: workshop ? "workshop" : "tutor-led",
        title: p.title,
        subtitle: p.subtitle ?? "",
        href: workshop ? `/workshops/${encodeURIComponent(p.slug)}` : liveTutorCourseHref(p.slug),
        meta: workshop ? "Workshop · Live" : "Tutor-led · Live",
      },
    });
  }

  for (const c of content.categories ?? []) {
    if (c.isActive === false) continue;
    const s = score(query, c.title ?? "", `${c.subtitle ?? ""} ${c.description ?? ""} ${c.slug}`);
    if (!s) continue;
    const count = courses.filter((x) => x.category?.toLowerCase() === c.slug?.toLowerCase()).length;
    scored.push({
      s: s + 20,
      r: {
        kind: "category",
        title: c.title,
        subtitle: c.subtitle ?? "",
        href: `/courses/category/${c.slug}`,
        meta: `Category · ${count} course${count === 1 ? "" : "s"}`,
      },
    });
  }

  return scored
    .sort((a, b) => b.s - a.s || a.r.title.localeCompare(b.r.title))
    .slice(0, limit)
    .map((x) => x.r);
}
