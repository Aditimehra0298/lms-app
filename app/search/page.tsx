import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Layers, Radio, Search, Wrench } from "lucide-react";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import { searchSite, type SiteSearchKind } from "@/lib/server/site-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search courses",
  robots: { index: false, follow: true },
};

const KIND_META: Record<SiteSearchKind, { label: string; Icon: typeof BookOpen }> = {
  course: { label: "Self-paced", Icon: BookOpen },
  "tutor-led": { label: "Tutor-led", Icon: Radio },
  workshop: { label: "Workshop", Icon: Wrench },
  category: { label: "Category", Icon: Layers },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 120);
  const results = query ? await searchSite(query, 50) : [];
  const categories = results.filter((r) => r.kind === "category");
  const items = results.filter((r) => r.kind !== "category");

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <form action="/search" className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300/80" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search courses, tutor-led programmes, workshops, categories…"
            className="w-full rounded-full border border-amber-500/40 bg-black/40 py-3.5 pl-12 pr-28 text-base outline-none focus:border-amber-400/70"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:brightness-110"
          >
            Search
          </button>
        </form>

        {query ? (
          <p className="mt-6 text-sm text-gray-400">
            {results.length === 0 ? "No results" : `${results.length} result${results.length === 1 ? "" : "s"}`} for{" "}
            <span className="font-semibold text-white">&ldquo;{query}&rdquo;</span>
          </p>
        ) : (
          <p className="mt-6 text-sm text-gray-400">Type what you want to learn — e.g. ESG, food safety, cyber security.</p>
        )}

        {categories.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">Categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-300/60"
                >
                  <Layers className="h-4 w-4" /> {c.title}
                  <span className="text-xs font-normal text-amber-100/60">{c.meta?.replace(/^Category · /, "")}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {items.length > 0 ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const { label, Icon } = KIND_META[r.kind];
              return (
                <Link
                  key={`${r.kind}-${r.href}`}
                  href={r.href}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-amber-300/40 hover:bg-white/[0.05]"
                >
                  <div className="relative h-36 bg-black/40">
                    {r.image && r.slug ? (
                      <CatalogMediaImage
                        storedSrc={r.image}
                        courseSlug={r.slug}
                        category={r.category ?? ""}
                        alt={r.title}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon className="h-10 w-10 text-amber-300/40" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                      <Icon className="h-3 w-3" /> {label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 font-semibold group-hover:text-amber-200">{r.title}</p>
                    {r.subtitle ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{r.subtitle}</p> : null}
                    {r.meta ? <p className="mt-auto pt-3 text-[11px] text-gray-500">{r.meta}</p> : null}
                  </div>
                </Link>
              );
            })}
          </section>
        ) : null}

        {query && results.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-semibold">We couldn&apos;t find anything for &ldquo;{query}&rdquo;</p>
            <p className="mt-2 text-sm text-gray-400">Try a shorter or different word, or browse all courses.</p>
            <Link href="/courses" className="mt-5 inline-block rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black">
              Browse all courses
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
