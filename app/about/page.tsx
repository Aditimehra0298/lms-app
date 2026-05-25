import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Sparkles } from "lucide-react";
import { readAdminContent } from "@/lib/server/content-store";
import { defaultAboutPageConfig } from "@/lib/content-schema";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const adminContent = await readAdminContent();
  const cfg = adminContent.aboutPage ?? defaultAboutPageConfig;

  const highlights = cfg.highlights;
  const pillars = cfg.pillars;
  const features = cfg.features;
  const trainingTechnologyPoints = cfg.techPoints;
  const teamHierarchy = cfg.teamHierarchy;
  const testimonials = cfg.testimonials;
  const accreditationCards = cfg.accreditations;
  const accreditationLogos = cfg.accreditations.map((a) => a.logo);
  const heroData = cfg.hero;
  const whoData = cfg.whoWeAre;
  const missionData = cfg.mission;
  const ctaData = cfg.cta;
  const impactStats = cfg.impactStats;
  const memberPhoto = (m: { name: string; photo: string }) =>
    m.photo || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.name)}&backgroundColor=f59e0b,7c3aed,0f172a&textColor=ffffff`;

  return (
    <div className="about-page min-h-screen bg-[#06080f] text-white">
      <main className="mx-auto w-full max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:p-8">
            <article className="order-2 space-y-4 lg:order-1">
              <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {heroData.badge}
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                {heroData.heading}
                <br />
                <span className="text-amber-300">{heroData.headingHighlight}</span>
              </h1>
              <p className="max-w-xl text-sm leading-7 text-gray-300">
                {heroData.subtitle}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black"
                >
                  {heroData.ctaPrimary} <ArrowRight size={14} />
                </Link>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold">
                  {heroData.ctaSecondary}
                </button>
              </div>
              <div className="grid gap-2 pt-3 sm:grid-cols-2 xl:grid-cols-4">
                {highlights.map((h) => (
                  <div key={h.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-lg font-bold text-amber-300">{h.value}</p>
                    <p className="text-xs text-gray-400">{h.label}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="order-1 relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/40 lg:order-2">
              <Image
                src={heroData.heroImage}
                alt="Digital future visual"
                fill
                className="object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#06080f] via-transparent to-transparent" />
            </article>
          </div>
        </section>

        <section className="about-who-we-are relative mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="relative min-h-[360px] md:min-h-[440px]">
            <Image
              src={whoData.backgroundImage}
              alt="Team collaborating on digital learning"
              fill
              className="object-cover"
            />
            <div className="about-who-overlay-x absolute inset-0 bg-linear-to-r from-[#050811]/95 via-[#050811]/72 to-[#050811]/35" />
            <div className="about-who-overlay-y absolute inset-0 bg-linear-to-t from-[#050811]/85 via-transparent to-transparent" />

            <div className="relative z-10 grid min-h-[360px] gap-6 p-6 md:min-h-[440px] md:p-8 lg:grid-cols-[1.05fr_1.2fr]">
              <article className="about-who-content self-center">
                <p className="about-who-badge inline-flex rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-200">
                  {whoData.badge}
                </p>
                <h2 className="about-who-title mt-3 text-4xl font-bold leading-tight">
                  {whoData.heading}
                  <br />
                  <span className="text-amber-300">{whoData.headingHighlight}</span>
                </h2>
                <p className="about-who-description mt-3 max-w-xl text-sm leading-7 text-gray-300">
                  {whoData.subtitle}
                </p>
                <ul className="about-who-list mt-4 space-y-2 text-sm text-gray-200">
                  {whoData.bulletPoints.map((item) => (
                    <li key={item} className="about-who-list-item inline-flex items-center gap-2">
                      <Sparkles size={14} className="text-violet-300" /> {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="grid content-end gap-3 sm:grid-cols-2">
                {pillars.map((p, idx) => (
                  <div key={p.title} className="rounded-2xl border border-white/15 bg-[#0a1120]/80 p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-xs">
                    <p className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                      {idx === 0 ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      )}
                      {p.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-gray-300">{p.desc}</p>
                  </div>
                ))}
              </article>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-amber-300/20 bg-linear-to-br from-[#1d1408] via-[#120d08] to-[#090808] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <article className="rounded-2xl border border-amber-400/25 bg-black/25 p-5 md:p-6">
              <p className="inline-flex rounded-full border border-amber-300/35 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                Our Mission
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">
                {missionData.heading} <span className="text-amber-300">{missionData.headingHighlight}</span>
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {missionData.body}
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {missionData.body2}
              </p>
            </article>

            <article className="rounded-2xl border border-amber-400/25 bg-black/25 p-5 md:p-6">
              <p className="inline-flex rounded-full border border-violet-300/35 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
                Our Training Technologies
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Our training technology relies on a strong &ldquo;Learning by Doing&rdquo; approach.
                We combine live platforms, skilled facilitators, and education expertise to create
                immersive learning experiences with measurable outcomes.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-200">
                {trainingTechnologyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-7">
          <div className="text-center">
            <p className="mx-auto inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-1 text-[11px] font-semibold tracking-wide text-amber-200">
              TRUSTED & ACCREDITED
            </p>
            <h3 className="mt-3 text-3xl font-bold md:text-4xl">
              Trusted &amp; Accredited by <span className="text-amber-300">Leading Organizations</span>
            </h3>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-gray-300">
              We collaborate with globally recognized organizations and industry bodies to deliver high-quality,
              industry-aligned training programs.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {accreditationCards.map((card, index) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_20px_rgba(0,0,0,0.25)]"
              >
                <div className="mx-auto flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/95 p-2">
                  <Image
                    unoptimized
                    src={accreditationLogos[index]}
                    alt={card.title}
                    width={220}
                    height={160}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-sm font-medium text-amber-200">{card.subtitle}</p>
                <p className="mt-2 text-xs leading-6 text-gray-400">{card.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((h) => (
              <div key={h.label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <Award className="h-5 w-5 text-amber-300" />
                <p className="mt-1 text-2xl font-bold">{h.value}</p>
                <p className="text-xs text-gray-400">{h.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-3xl font-bold">
            Why Thousands <span className="text-amber-300">Choose Sustainable Futures Trainings?</span>
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="mb-4">
            <h3 className="text-3xl font-bold">
              Meet Our <span className="text-amber-300">Sustainable Futures Trainings Team</span>
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Our leadership and expert team is structured to deliver high-quality learning outcomes
              through strong coordination and domain excellence.
            </p>
          </div>
          <div className="space-y-3">
            <div className="mx-auto max-w-md rounded-xl border border-amber-400/35 bg-linear-to-b from-amber-500/15 to-transparent p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                {teamHierarchy[0]?.level}
              </p>
              {teamHierarchy[0]?.members.map((m) => (
                <div key={m.name} className="mt-3 flex flex-col items-center">
                  <Image
                    unoptimized
                    src={memberPhoto(m)}
                    alt={m.name}
                    width={68}
                    height={68}
                    className="h-17 w-17 rounded-full border border-amber-300/60 object-cover"
                  />
                  <p className="mt-2 text-base font-bold text-white">{m.name}</p>
                  {m.role ? <p className="mt-0.5 text-xs text-gray-300">{m.role}</p> : null}
                </div>
              ))}
            </div>

            {teamHierarchy.slice(1).map((tier, tierIdx) => (
              <div key={tier.level}>
                <div className="mx-auto h-6 w-px bg-amber-300/40" />
                {tierIdx < teamHierarchy.length - 2 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {tier.members.map((m) => (
                      <div key={m.name} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                        <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full border border-amber-300/60">
                          <Image unoptimized src={memberPhoto(m)} alt={m.name} width={56} height={56} className="h-full w-full object-cover" />
                        </div>
                        <p className="text-sm font-semibold text-white">{m.name}</p>
                        {m.role ? <p className="mt-1 text-xs text-gray-300">{m.role}</p> : null}
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">{tier.level}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">{tier.level}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {tier.members.map((m) => (
                        <div key={m.name} className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
                          <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border border-amber-300/60">
                            <Image unoptimized src={memberPhoto(m)} alt={m.name} width={48} height={48} className="h-full w-full object-cover" />
                          </div>
                          <p className="text-sm font-semibold text-white">{m.name}</p>
                          {m.role ? <p className="mt-1 text-xs text-gray-300">{m.role}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-3xl font-bold">
            Our Impact <span className="text-amber-300">in Numbers</span>
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {impactStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Award className="h-5 w-5 text-amber-300" />
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-3xl font-bold">
              What Our <span className="text-amber-300">Learners Say</span>
            </h3>
            <button className="text-xs font-semibold text-amber-200">View all reviews</button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {testimonials.map((quote) => (
              <blockquote key={quote} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                “{quote}”
              </blockquote>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-300/20 bg-linear-to-r from-amber-500/10 to-yellow-500/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold">{ctaData.heading}</p>
              <p className="text-sm text-gray-300">
                {ctaData.subtitle}
              </p>
            </div>
            <Link href="/courses" className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
              {ctaData.buttonText}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
