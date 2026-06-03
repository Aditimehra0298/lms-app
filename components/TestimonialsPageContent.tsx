"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TestimonialAvatar from "@/components/TestimonialAvatar";
import type { HomePageSectionMeta, HomePageTestimonial } from "@/lib/content-schema";

type Props = {
  meta: HomePageSectionMeta;
  testimonials: HomePageTestimonial[];
};

export default function TestimonialsPageContent({ meta, testimonials }: Props) {
  const items = testimonials.filter((t) => t.quote.trim() && t.name.trim());

  return (
    <div className="min-h-screen bg-[#06080f] text-white">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-12">
        <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
          {meta.badge}
        </p>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">{meta.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">{meta.subtitle}</p>

        {items.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((t) => {
              const key = `${t.name}-${t.quote.slice(0, 24)}`;
              return (
                <blockquote
                  key={key}
                  className="flex flex-col rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_24px_rgba(249,177,77,0.16)]"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <TestimonialAvatar testimonial={t} size={56} />
                    <div>
                      <div className="font-bold text-white">{t.name}</div>
                      {t.role?.trim() ? <div className="text-xs text-gray-500">{t.role}</div> : null}
                    </div>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-gray-300">&ldquo;{t.quote}&rdquo;</p>
                </blockquote>
              );
            })}
          </div>
        ) : (
          <p className="mt-10 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
            Testimonials will appear here once added in the admin panel. Upload a client photo URL for each review.
          </p>
        )}

        <Link
          href="/courses"
          className="mt-10 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black"
        >
          Explore courses <ArrowRight size={14} />
        </Link>
      </main>
    </div>
  );
}
