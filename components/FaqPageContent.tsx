"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CategoryFaqAccordion from "@/components/CategoryFaqAccordion";
import type { HomePageSectionMeta } from "@/lib/content-schema";
import type { SiteFaqGroup } from "@/lib/site-faq-types";

type Props = {
  meta: HomePageSectionMeta;
  groups: SiteFaqGroup[];
  faqImage?: string;
};

export default function FaqPageContent({ meta, groups, faqImage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section")?.trim() || "";

  const visibleGroups = sectionId
    ? groups.filter((g) => g.id === sectionId)
    : groups;

  const total = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="faq-page min-h-screen bg-[#06080f] text-white">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-12">
        <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
          {meta.badge}
        </p>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">{meta.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">{meta.subtitle}</p>
        {total > 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            {sectionId
              ? `${total} question${total === 1 ? "" : "s"} for this page section.`
              : `${total} questions across all pages.`}
          </p>
        ) : null}

        {groups.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/faq")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                !sectionId
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                  : "border-white/15 text-gray-400 hover:border-white/25"
              }`}
            >
              All pages
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => router.push(`/faq?section=${encodeURIComponent(g.id)}`)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  sectionId === g.id
                    ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                    : "border-white/15 text-gray-400 hover:border-white/25"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-10">
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <section key={group.label}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-white">{group.label}</h2>
                    {group.href ? (
                      <Link
                        href={group.href}
                        className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
                      >
                        View page <ArrowRight size={12} className="inline" />
                      </Link>
                    ) : null}
                  </div>
                  <CategoryFaqAccordion items={group.items} />
                </section>
              ))
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                {sectionId
                  ? "No FAQs for this page yet. Browse all FAQs for more help."
                  : "FAQs will appear here soon."}
                {sectionId ? (
                  <button
                    type="button"
                    onClick={() => router.push("/faq")}
                    className="mt-3 block w-full text-amber-300 hover:underline"
                  >
                    View all FAQ sections
                  </button>
                ) : null}
              </p>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
            >
              Still have questions? Contact us <ArrowRight size={14} />
            </Link>
          </div>
          {faqImage?.trim() ? (
            <div className="relative mx-auto h-[280px] w-full max-w-[300px] shrink-0 lg:mx-0">
              <Image
                src={faqImage}
                alt=""
                fill
                unoptimized={faqImage.startsWith("http")}
                className="object-contain object-bottom"
                sizes="300px"
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
