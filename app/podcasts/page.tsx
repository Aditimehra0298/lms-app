import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Headphones, Play } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { podcastEpisodes } from "@/lib/lms-site-pages";

export const metadata: Metadata = {
  title: `Podcasts — ${COMPANY_DISPLAY_NAME}`,
  description: `Short learning podcasts aligned with ${COMPANY_DISPLAY_NAME} LMS courses.`,
};

export default function PodcastsPage() {
  return (
    <LmsContentPageShell
      badge="Audio learning"
      title="Learning"
      titleHighlight="Podcasts"
      subtitle="Bite-sized episodes that mirror our LMS themes — cyber awareness, ESG, and professional learning habits."
      imageSrc="/lms-podcasts-hero.png"
      imageAlt="Learning podcasts"
      ctaHref="/my-learning"
      ctaLabel="Open My Learning"
      secondaryCtaHref="/courses"
      secondaryCtaLabel="Browse courses"
    >
      <div className="space-y-4">
        {podcastEpisodes.map((ep, index) => (
          <article
            key={ep.slug}
            className="lh-path-card grid overflow-hidden rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] shadow-[0_0_24px_rgba(249,177,77,0.14)] transition-all hover:border-amber-300/70 sm:grid-cols-[180px_1fr_auto]"
          >
            <div className="relative flex min-h-[150px] items-center justify-center bg-black/30 p-3 sm:min-h-[160px]">
              <Image
                src={ep.image}
                alt={ep.title}
                width={280}
                height={220}
                className="h-auto max-h-[140px] w-full object-contain"
                sizes="180px"
              />
              <span className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/40 bg-black/55 text-amber-200 backdrop-blur-sm">
                <Headphones size={16} />
              </span>
              <span className="absolute bottom-3 left-3 text-xs font-extrabold tracking-wide text-white/90">
                EP {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-col justify-center p-4 md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
                {ep.category} · {ep.duration}
              </p>
              <h2 className="lh-card-title mt-1 text-base font-bold text-white md:text-lg">{ep.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{ep.description}</p>
            </div>
            <div className="flex items-center p-4 sm:pr-5">
              <Link
                href="/courses"
                className="lh-gold-btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-5 py-2.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,.3)] transition-all hover:brightness-110 sm:w-auto"
              >
                <Play size={14} /> Related courses
              </Link>
            </div>
          </article>
        ))}
      </div>

      <LmsContentCard title="Course podcasts inside My Learning">
        <p>
          Many self-paced courses also include a Podcast learning tool after enrollment. Open{" "}
          <Link href="/my-learning" className="font-bold text-[#eb9422] underline decoration-amber-500/40">
            My Learning
          </Link>{" "}
          and check Learning tools for audio linked to your course.
        </p>
      </LmsContentCard>
    </LmsContentPageShell>
  );
}
