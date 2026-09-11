"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { liveTutorCourseHref, TUTOR_LED_ISO_22000_CATALOG_HREF, isIso22000TutorLedSlug } from "@/lib/tutor-led-routes";
import { ChevronRight, Radio, Video } from "lucide-react";

type Props = {
  programs?: TutorLedProgramStored[];
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Public catalog of live programs — mirrors /courses list; each card opens its own landing. */
export default function TutorLedCatalogLanding({ programs = [] }: Props) {
  const router = useRouter();
  const published = programs.filter((p) => p.published && p.programKind !== "workshop");
  const iso = published.filter((p) => isIso22000TutorLedSlug(p.slug));
  const live = iso.length
    ? [
        {
          ...iso[0],
          slug: "iso-22000",
          title: "ISO 22000:2018 Training Programs",
          subtitle: "Four live levels — Foundation through Lead Auditor. Open the catalog to choose your program.",
          heroSrc: iso[0].heroSrc || "/tutor-led-iso-hero.png",
          badge: "TUTOR LED",
          price: Math.min(...iso.map((p) => p.price)),
        },
        ...published.filter((p) => !isIso22000TutorLedSlug(p.slug)),
      ]
    : published;

  const enroll = (slug: string) => {
    registerTutorLedFromTemplate(router, slug);
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(111,85,255,0.22), transparent 55%), linear-gradient(180deg, #0a1020 0%, #05070f 100%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1760px] px-4 py-12 sm:px-6 md:px-8 md:py-16 xl:px-10">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Live tutor-led training
          </p>
          <h1 className="mt-3 max-w-3xl text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.6rem]">
            Live Zoom programs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Each course has its own landing page — browse below, then open a program for schedule, pricing,
            and enrollment. Managed in Admin like self-paced courses.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1760px] px-4 py-10 sm:px-6 md:px-8 xl:px-10">
        {live.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#0b1220]/80 px-6 py-16 text-center">
            <Video className="mx-auto h-10 w-10 text-violet-400/60" aria-hidden />
            <p className="mt-4 text-sm font-medium text-white">No live programs published yet</p>
            <p className="mt-2 text-xs text-zinc-500">
              Admin → Tutor Led → create a program, upload landing images, then Publish.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((p) => {
              const thumb = p.heroSrc?.trim() || "";
              const href = isIso22000TutorLedSlug(p.slug)
                ? TUTOR_LED_ISO_22000_CATALOG_HREF
                : liveTutorCourseHref(p.slug);
              return (
                <article
                  key={p.slug}
                  className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1220]"
                >
                  <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-zinc-900">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={p.heroAlt || p.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-950/80 to-[#0b1220]">
                        <Video className="h-10 w-10 text-violet-300/70" aria-hidden />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col p-4">
                    {p.badge ? (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                        {p.badge}
                      </p>
                    ) : null}
                    <Link href={href} className="mt-1 text-lg font-bold text-white hover:text-violet-200">
                      {p.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {p.subtitle}
                    </p>
                    {(p.nextBatchDate || p.schedule) && (
                      <p className="mt-3 text-[11px] text-zinc-500">
                        {[p.nextBatchDate, p.schedule].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="mt-3 text-xl font-extrabold text-white">
                      {formatInr(typeof p.price === "number" ? p.price : 0)}
                    </p>
                    {p.originalPrice && p.originalPrice > p.price ? (
                      <p className="text-[11px] text-zinc-500 line-through">
                        {formatInr(p.originalPrice)}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {isIso22000TutorLedSlug(p.slug) ? (
                        <Link
                          href={TUTOR_LED_ISO_22000_CATALOG_HREF}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#6f55ff] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#7d63ff]"
                        >
                          View programs
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => enroll(p.slug)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#6f55ff] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#7d63ff]"
                        >
                          Enroll now
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                      <Link
                        href={href}
                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                      >
                        View landing
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
