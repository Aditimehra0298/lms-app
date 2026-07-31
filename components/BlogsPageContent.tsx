"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { blogPosts } from "@/lib/lms-site-pages";

export default function BlogsPageContent() {
  const [featured, ...rest] = blogPosts;

  return (
    <LmsContentPageShell
      badge="Insights · Learning hub"
      title="Learning"
      titleHighlight="Blogs"
      subtitle="Practical articles for learners and teams — written in the same professional tone as our homepage and LMS training."
      imageSrc="/lms-blogs-hero.png"
      imageAlt="Learning blogs and insights"
      ctaHref="/courses"
      ctaLabel="Explore courses"
      secondaryCtaHref="/book-a-call"
      secondaryCtaLabel="Talk to an advisor"
    >
      {featured ? (
        <Link
          href={`/blogs/${featured.slug}`}
          className="lh-path-card group grid overflow-hidden rounded-3xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] shadow-[0_0_32px_rgba(249,177,77,0.16)] transition-all hover:border-amber-300/70 md:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="relative flex min-h-[240px] items-center justify-center bg-black/30 p-4 md:min-h-[320px]">
            <Image
              src={featured.image}
              alt={featured.title}
              width={900}
              height={700}
              className="h-auto max-h-[300px] w-full object-contain transition duration-500 group-hover:scale-[1.02] md:max-h-[360px]"
              sizes="(max-width: 768px) 100vw, 55vw"
              priority
            />
            <span className="lh-premium-badge absolute left-4 top-4 rounded-full border border-amber-300/40 bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 backdrop-blur-sm">
              Featured
            </span>
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/90">{featured.category}</p>
            <h2 className="lh-card-title mt-2 text-2xl font-extrabold text-white md:text-[1.85rem]">{featured.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{featured.excerpt}</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {featured.readMinutes} min
              </span>
              <span>·</span>
              <span>
                {new Date(featured.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#fde68a]">
              Read article <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((post) => (
          <article
            key={post.slug}
            className="lh-course-card group flex flex-col overflow-hidden rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] shadow-[0_0_24px_rgba(249,177,77,0.14)] transition-all hover:border-amber-300/70 hover:shadow-[0_0_32px_rgba(249,177,77,0.22)]"
          >
            <div className="relative flex h-44 items-center justify-center overflow-hidden bg-black/30 p-3">
              <Image
                src={post.image}
                alt={post.title}
                width={480}
                height={360}
                className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <p className="absolute bottom-3 left-3 rounded-full border border-amber-400/30 bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 backdrop-blur-sm">
                {post.category}
              </p>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="lh-card-title text-base font-bold text-white">{post.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {post.readMinutes} min
                </span>
                <Link
                  href={`/blogs/${post.slug}`}
                  className="inline-flex items-center gap-1 font-bold text-[#fde68a] hover:underline"
                >
                  Read <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <LmsContentCard title="Want a topic covered?">
        <p>
          Tell us what your team needs next via{" "}
          <Link href="/contact" className="font-bold text-[#eb9422] underline decoration-amber-500/40">
            Contact
          </Link>{" "}
          or{" "}
          <Link href="/book-a-call" className="font-bold text-[#eb9422] underline decoration-amber-500/40">
            Book a Call
          </Link>
          .
        </p>
      </LmsContentCard>
    </LmsContentPageShell>
  );
}
