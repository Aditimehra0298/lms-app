"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Award, Medal, Quote, Star } from "lucide-react";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { buildCertificateEarnedPageUrl } from "@/lib/certificate-share-url";
import type { LearnerBadge } from "@/lib/learner-badges";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

type CompletedCourse = {
  title: string;
  slug?: string;
  image?: string;
  completed: number;
  modules: number;
};

type Testimonial = {
  id: string;
  user: string;
  courseTitle: string;
  body: string;
  rating: number;
  courseSlug: string;
};

export type CommunityWallSubmission = {
  id: string;
  courseSlug: string;
  courseTitle: string;
  externalPlatform?: string | null;
  attachmentUrl: string;
  authorName: string;
  status: "pending" | "approved" | "rejected";
};

type Props = {
  certificates: CertificateRowDto[];
  earnedBadges: LearnerBadge[];
  completedCourses: CompletedCourse[];
  testimonials: Testimonial[];
  submissions?: CommunityWallSubmission[];
  globalBadgeImage?: string;
};

function Pill({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "emerald" | "violet" | "sky";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
      : tone === "violet"
        ? "bg-violet-500/20 text-violet-200 ring-violet-400/30"
        : tone === "sky"
          ? "bg-sky-500/20 text-sky-200 ring-sky-400/30"
          : "bg-[#FFC107]/15 text-[#FFC107] ring-[#FFC107]/35";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const sz = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sz} ${n <= value ? "fill-[#FFC107] text-[#FFC107]" : "text-zinc-600"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function MediaThumb({
  src,
  alt,
  courseSlug,
  className = "",
  contain = false,
}: {
  src?: string;
  alt: string;
  courseSlug?: string;
  className?: string;
  contain?: boolean;
}) {
  const [displaySrc, setDisplaySrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const raw = src?.trim() ?? "";
    if (!raw) {
      setDisplaySrc("");
      return;
    }
    if (raw.startsWith("/api/media/serve/") || raw.startsWith("/storage/private/")) {
      let cancelled = false;
      void resolveProtectedMediaUrl(raw, { courseSlug, scope: "learner" }).then((resolved) => {
        if (!cancelled) setDisplaySrc(resolved || raw);
      });
      return () => {
        cancelled = true;
      };
    }
    setDisplaySrc(raw);
  }, [src, courseSlug]);

  if (!displaySrc || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-violet-500/10 text-amber-300/80 ${className}`}
      >
        <Award className="h-8 w-8" aria-hidden />
      </div>
    );
  }

  if (displaySrc.startsWith("http") || displaySrc.startsWith("/")) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={displaySrc}
          alt={alt}
          fill
          unoptimized
          className={contain ? "object-contain p-1" : "object-cover"}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return null;
}

export function CommunitySuccessWall({
  certificates,
  earnedBadges,
  completedCourses,
  testimonials,
  submissions = [],
  globalBadgeImage,
}: Props) {
  const readyCerts = useMemo(
    () =>
      certificates.filter(
        (c) => c.status === "ready" && c.visibleToLearner !== false && c.courseSlug?.trim(),
      ),
    [certificates],
  );

  const badgeByCourse = useMemo(() => {
    const map = new Map<string, { url: string; title: string; subtitle: string; slug: string }>();
    for (const c of readyCerts) {
      const url = c.badgeImage?.trim() || globalBadgeImage?.trim();
      if (!url || !c.courseSlug) continue;
      map.set(c.courseSlug, {
        url,
        title: c.learnerName?.split(" ")[0] ?? "Learner",
        subtitle: c.courseTitle,
        slug: c.courseSlug,
      });
    }
    for (const b of earnedBadges) {
      const url = b.badgeImageUrl?.trim() || globalBadgeImage?.trim();
      if (!url) continue;
      if (!map.has(b.courseSlug)) {
        map.set(b.courseSlug, {
          url,
          title: "Learner",
          subtitle: b.courseTitle,
          slug: b.courseSlug,
        });
      }
    }
    return Array.from(map.values());
  }, [readyCerts, earnedBadges, globalBadgeImage]);

  const progressCards = useMemo(() => {
    const certSlugs = new Set(readyCerts.map((c) => c.courseSlug));
    return completedCourses
      .filter((c) => c.slug && !certSlugs.has(c.slug))
      .slice(0, 2);
  }, [completedCourses, readyCerts]);

  const topTestimonials = useMemo(
    () => testimonials.filter((t) => t.rating >= 4 && t.body.trim()).slice(0, 2),
    [testimonials],
  );

  const wallSubmissions = useMemo(
    () => submissions.filter((s) => s.attachmentUrl?.trim()),
    [submissions],
  );

  const hasContent =
    readyCerts.length > 0 ||
    badgeByCourse.length > 0 ||
    progressCards.length > 0 ||
    topTestimonials.length > 0 ||
    wallSubmissions.length > 0;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (!hasContent) {
    return (
      <p className="mt-3 text-sm text-zinc-500">
        Complete a course, earn your certificate, or unlock module badges to appear on the success
        wall.
      </p>
    );
  }

  return (
    <>
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin">
        {readyCerts.map((cert) => {
          const href = cert.courseSlug
            ? `/my-learning/course/${encodeURIComponent(cert.courseSlug)}#credentials`
            : "/my-learning?tab=certificates";
          const shareUrl =
            origin && cert.delegateNumber
              ? buildCertificateEarnedPageUrl(origin, cert)
              : href;
          const thumb = cert.templateImage?.trim() || cert.badgeImage?.trim() || globalBadgeImage;

          return (
            <Link
              key={`cert-${cert.id}`}
              href={shareUrl.startsWith("http") ? shareUrl : href}
              target={shareUrl.startsWith("http") ? "_blank" : undefined}
              rel={shareUrl.startsWith("http") ? "noreferrer" : undefined}
              className="w-[152px] shrink-0 rounded-xl border border-white/10 bg-black/35 p-2.5 transition hover:border-[#FFC107]/35"
            >
              <MediaThumb
                src={thumb}
                alt={`${cert.courseTitle} certificate`}
                courseSlug={cert.courseSlug}
                className="aspect-[4/3] w-full rounded-lg border border-white/10 bg-white"
                contain
              />
              <div className="mt-2">
                <Pill>Certified</Pill>
              </div>
              <p className="mt-1.5 truncate text-xs font-bold text-white">
                {cert.learnerName?.split(" ")[0] ?? "Learner"}
              </p>
              <p className="truncate text-[10px] leading-snug text-zinc-400">{cert.courseTitle}</p>
              {cert.scorePercent != null ? (
                <p className="mt-1 font-mono text-[10px] text-[#FFC107]">{cert.scorePercent}%</p>
              ) : null}
            </Link>
          );
        })}

        {badgeByCourse.map((badge) => (
          <Link
            key={`badge-${badge.slug}`}
            href={`/my-learning/course/${encodeURIComponent(badge.slug)}#credentials`}
            className="w-[152px] shrink-0 rounded-xl border border-white/10 bg-black/35 p-2.5 transition hover:border-amber-400/35"
          >
            <div className="relative flex aspect-[4/3] items-center justify-center rounded-lg border border-amber-400/20 bg-gradient-to-b from-amber-500/10 via-black/40 to-violet-500/10">
              <MediaThumb
                src={badge.url}
                alt={`${badge.subtitle} badge`}
                courseSlug={badge.slug}
                className="h-[4.5rem] w-[4.5rem]"
                contain
              />
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                <Medal className="h-3 w-3" aria-hidden />
              </span>
            </div>
            <div className="mt-2">
              <Pill>Certified</Pill>
            </div>
            <p className="mt-1.5 truncate text-xs font-bold text-white">{badge.title}</p>
            <p className="truncate text-[10px] leading-snug text-zinc-400">{badge.subtitle}</p>
          </Link>
        ))}

        {progressCards.map((course) => {
          const pct = Math.round((course.completed / Math.max(1, course.modules)) * 100);
          return (
            <Link
              key={`prog-${course.slug}`}
              href={`/my-learning/course/${encodeURIComponent(course.slug!)}`}
              className="w-[152px] shrink-0 rounded-xl border border-white/10 bg-black/35 p-2.5 transition hover:border-emerald-500/30"
            >
              {course.image?.trim() ? (
                <MediaThumb
                  src={course.image}
                  alt={course.title}
                  courseSlug={course.slug}
                  className="aspect-[4/3] w-full rounded-lg border border-white/10"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Award className="h-8 w-8 text-emerald-400/60" aria-hidden />
                </div>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2">
                <Pill tone="emerald">Completed</Pill>
              </div>
              <p className="mt-1.5 truncate text-xs font-bold text-white">{course.title}</p>
              <p className="text-[10px] text-zinc-500">
                {course.completed}/{course.modules} modules
              </p>
            </Link>
          );
        })}

        {wallSubmissions.map((sub) => {
          const isExternal = sub.courseSlug === "external";
          const title = isExternal
            ? sub.externalPlatform || sub.courseTitle
            : sub.courseTitle;
          return (
            <article
              key={`sub-${sub.id}`}
              className="w-[152px] shrink-0 rounded-xl border border-white/10 bg-black/35 p-2.5"
            >
              <MediaThumb
                src={sub.attachmentUrl}
                alt={`${title} proof`}
                courseSlug={isExternal ? undefined : sub.courseSlug}
                className="aspect-[4/3] w-full rounded-lg border border-white/10 bg-white"
                contain
              />
              <div className="mt-2">
                <Pill tone={isExternal ? "sky" : "gold"}>
                  {sub.status === "pending"
                    ? "Pending review"
                    : isExternal
                      ? "External cert"
                      : "Submitted"}
                </Pill>
              </div>
              <p className="mt-1.5 truncate text-xs font-bold text-white">
                {sub.authorName.split(" ")[0] ?? "Learner"}
              </p>
              <p className="truncate text-[10px] leading-snug text-zinc-400">{title}</p>
            </article>
          );
        })}

        {topTestimonials.map((t) => (
          <article
            key={t.id}
            className="w-[168px] shrink-0 rounded-xl border border-white/10 bg-black/35 p-2.5"
          >
            <Quote className="h-4 w-4 text-violet-300/80" aria-hidden />
            <p className="mt-1 line-clamp-3 text-[11px] italic leading-snug text-zinc-300">
              &ldquo;{t.body}&rdquo;
            </p>
            <div className="mt-2">
              <Stars value={t.rating} size="xs" />
            </div>
            <p className="mt-1.5 truncate text-xs font-bold text-white">{t.user}</p>
            <p className="truncate text-[10px] text-zinc-500">{t.courseTitle}</p>
            <div className="mt-2">
              <Pill tone="violet">Top learner</Pill>
            </div>
          </article>
        ))}
      </div>

      <Link
        href="/my-learning?tab=certificates"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#FFC107] hover:underline"
      >
        View more success stories
        <span aria-hidden>→</span>
      </Link>
    </>
  );
}
