"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Award, FileText, Flame, Medal, ShieldCheck, Star, Trophy } from "lucide-react";
import { LearnerOtherCredentialsUpload } from "@/components/LearnerOtherCredentialsUpload";
import {
  isPdfCredential,
  LEARNER_OTHER_CREDENTIALS_EVENT,
  readLearnerOtherCredentials,
  type LearnerOtherCredential,
} from "@/lib/learner-other-credentials";
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
  status?: string;
};

type Props = {
  learnerFirstName: string;
  certificates: CertificateRowDto[];
  earnedBadges: LearnerBadge[];
  completedCourses: CompletedCourse[];
  globalBadgeImage?: string;
  stats: {
    enrolled: number;
    inProgress: number;
    completed: number;
    modulesDone: number;
    notStarted: number;
  };
  overallProgressPercent: number;
};

function FamePill({
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
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function FameFrame({
  href,
  frameTone = "gold",
  label,
  labels,
  labelTone,
  title,
  subtitle,
  meta,
  children,
}: {
  href?: string;
  frameTone?: "gold" | "violet" | "emerald";
  label?: string;
  labels?: Array<{ text: string; tone?: "gold" | "emerald" | "violet" | "sky" }>;
  labelTone?: "gold" | "emerald" | "violet" | "sky";
  title: string;
  subtitle?: string;
  meta?: string;
  children: ReactNode;
}) {
  const border =
    frameTone === "violet"
      ? "border-violet-400/45 from-violet-500/15"
      : frameTone === "emerald"
        ? "border-emerald-400/40 from-emerald-500/12"
        : "border-[#FFC107]/50 from-[#FFC107]/12";

  const inner = (
    <article className="group w-[172px] shrink-0 snap-start">
      <div
        className={`rounded-xl border-2 bg-gradient-to-b to-black/80 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition group-hover:shadow-[0_12px_32px_rgba(255,193,7,0.12)] ${border}`}
      >
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50 ring-1 ring-white/5">
          {children}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(labels ?? (label ? [{ text: label, tone: labelTone }] : [])).map((pill) => (
          <FamePill key={pill.text} tone={pill.tone ?? labelTone}>
            {pill.text}
          </FamePill>
        ))}
      </div>
      <p className="mt-1.5 truncate text-xs font-bold text-white">{title}</p>
      {subtitle ? (
        <p className="truncate text-[10px] leading-snug text-zinc-400">{subtitle}</p>
      ) : null}
      {meta ? <p className="mt-0.5 font-mono text-[10px] text-[#FFC107]">{meta}</p> : null}
    </article>
  );

  if (href) {
    if (href.startsWith("http")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]/50"
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]/50">
        {inner}
      </Link>
    );
  }
  return inner;
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
        className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-amber-500/10 to-violet-500/10 text-amber-300/70 ${className}`}
      >
        <Award className="h-9 w-9" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className || "aspect-[4/3] w-full"}`}>
      <Image
        src={displaySrc}
        alt={alt}
        fill
        unoptimized
        className={contain ? "object-contain p-1.5" : "object-cover"}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function CertWithBadgeFrame({
  certificateSrc,
  badgeSrc,
  courseSlug,
  certAlt,
}: {
  certificateSrc?: string;
  badgeSrc?: string;
  courseSlug?: string;
  certAlt: string;
}) {
  return (
    <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-zinc-100">
      <MediaThumb
        src={certificateSrc}
        alt={certAlt}
        courseSlug={courseSlug}
        className="h-full w-full"
        contain
      />
      {badgeSrc?.trim() ? (
        <div className="absolute bottom-1.5 right-1.5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FFC107]/70 bg-black/85 p-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <MediaThumb
              src={badgeSrc}
              alt="Course badge"
              courseSlug={courseSlug}
              className="h-full w-full"
              contain
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-black">
            <Medal className="h-2.5 w-2.5" aria-hidden />
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function MyLearningAchievementsTab({
  learnerFirstName,
  certificates,
  earnedBadges,
  completedCourses,
  globalBadgeImage,
  stats,
  overallProgressPercent,
}: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [otherCredentials, setOtherCredentials] = useState<LearnerOtherCredential[]>([]);

  useEffect(() => {
    const refresh = () => setOtherCredentials(readLearnerOtherCredentials());
    refresh();
    window.addEventListener(LEARNER_OTHER_CREDENTIALS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEARNER_OTHER_CREDENTIALS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const readyCerts = useMemo(
    () =>
      certificates.filter(
        (c) => c.status === "ready" && c.visibleToLearner !== false && c.courseSlug?.trim(),
      ),
    [certificates],
  );

  const badgeByCourseSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of earnedBadges) {
      const url = b.badgeImageUrl?.trim() || globalBadgeImage?.trim();
      if (url && b.courseSlug) map.set(b.courseSlug, url);
    }
    return map;
  }, [earnedBadges, globalBadgeImage]);

  const badgeOnlyFrames = useMemo(() => {
    const certSlugs = new Set(readyCerts.map((c) => c.courseSlug));
    const items: Array<{
      id: string;
      courseSlug: string;
      title: string;
      subtitle: string;
      imageUrl: string;
      href: string;
    }> = [];

    for (const b of earnedBadges) {
      const url = b.badgeImageUrl?.trim() || globalBadgeImage?.trim();
      if (!url || certSlugs.has(b.courseSlug)) continue;
      items.push({
        id: b.id,
        courseSlug: b.courseSlug,
        title: b.moduleTitle,
        subtitle: b.courseTitle,
        imageUrl: url,
        href: `/my-learning/course/${encodeURIComponent(b.courseSlug)}#credentials`,
      });
    }

    return items;
  }, [readyCerts, earnedBadges, globalBadgeImage]);

  const resolveBadgeForCert = (cert: CertificateRowDto) =>
    cert.badgeImage?.trim() ||
    (cert.courseSlug ? badgeByCourseSlug.get(cert.courseSlug) : undefined) ||
    globalBadgeImage?.trim() ||
    "";

  const progressFrames = useMemo(() => {
    const certSlugs = new Set(readyCerts.map((c) => c.courseSlug));
    return completedCourses
      .filter(
        (c) =>
          c.slug &&
          !certSlugs.has(c.slug) &&
          (c.status?.toLowerCase() === "completed" || c.completed >= c.modules),
      )
      .slice(0, 4);
  }, [completedCourses, readyCerts]);

  const hasWall =
    readyCerts.length > 0 ||
    badgeOnlyFrames.length > 0 ||
    progressFrames.length > 0 ||
    otherCredentials.length > 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)] md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFC107]/80">
            Key success
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Wall of Fame
            {learnerFirstName !== "there" ? (
              <span className="text-zinc-400"> — {learnerFirstName}</span>
            ) : null}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Certificates, badges, and completed programs — plus any other credentials you upload.
          </p>
        </div>
        <Link
          href="/my-learning?tab=certificates"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/10 px-3 py-2 text-xs font-semibold text-[#FFC107] hover:bg-[#FFC107]/20"
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          All certificates
        </Link>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { icon: ShieldCheck, label: "Enrolled", value: stats.enrolled },
          { icon: Flame, label: "In progress", value: stats.inProgress },
          { icon: Trophy, label: "Completed", value: stats.completed },
          { icon: Medal, label: "Modules", value: stats.modulesDone },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2"
          >
            <Icon className="h-4 w-4 text-[#FFC107]" aria-hidden />
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-[10px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {!hasWall ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">
          Complete a course or upload an external certificate to appear on your wall of fame.
          <Link href="/courses" className="mt-2 block text-[#FFC107] hover:underline">
            Browse courses
          </Link>
        </p>
      ) : (
        <div className="-mx-1 mt-5 snap-x snap-mandatory overflow-x-auto px-1 pb-2 scrollbar-thin">
          <div className="flex min-w-min gap-3">
            {otherCredentials.map((item) => {
              const isPdf = isPdfCredential(item.name, item.url);
              const href = item.url.startsWith("http") ? item.url : `${origin}${item.url}`;
              return (
                <FameFrame
                  key={item.id}
                  href={href}
                  frameTone="sky"
                  label="Other certificate"
                  labelTone="sky"
                  title={item.name.replace(/\.[^.]+$/, "")}
                  subtitle="Uploaded credential"
                  meta={new Date(item.uploadedAt).toLocaleDateString()}
                >
                  {isPdf ? (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-sky-500/10 px-2">
                      <FileText className="h-10 w-10 text-sky-300/80" aria-hidden />
                      <span className="text-center text-[9px] font-semibold uppercase tracking-wide text-sky-200/90">
                        PDF
                      </span>
                    </div>
                  ) : (
                    <MediaThumb
                      src={item.url}
                      alt={item.name}
                      className="aspect-[4/3] w-full"
                      contain
                    />
                  )}
                </FameFrame>
              );
            })}

            {readyCerts.map((cert) => {
              const href = cert.courseSlug
                ? `/my-learning/certificates/${encodeURIComponent(cert.id)}`
                : "/my-learning?tab=certificates";
              const shareUrl =
                origin && cert.delegateNumber
                  ? buildCertificateEarnedPageUrl(origin, cert)
                  : href;
              const certThumb = cert.templateImage?.trim() || "";
              const badgeThumb = resolveBadgeForCert(cert);
              const hasBadge = Boolean(badgeThumb);
              const showBadgeOverlay = Boolean(certThumb && badgeThumb);

              return (
                <FameFrame
                  key={`cert-${cert.id}`}
                  href={shareUrl.startsWith("http") ? shareUrl : href}
                  frameTone="gold"
                  labels={[
                    { text: "Certificate", tone: "gold" },
                    ...(hasBadge ? [{ text: "Badge", tone: "violet" as const }] : []),
                  ]}
                  title={cert.learnerName?.split(" ")[0] ?? "Learner"}
                  subtitle={cert.courseTitle}
                  meta={cert.scorePercent != null ? `${cert.scorePercent}%` : undefined}
                >
                  <CertWithBadgeFrame
                    certificateSrc={certThumb || badgeThumb}
                    badgeSrc={showBadgeOverlay ? badgeThumb : undefined}
                    courseSlug={cert.courseSlug}
                    certAlt={`${cert.courseTitle} certificate`}
                  />
                </FameFrame>
              );
            })}

            {badgeOnlyFrames.map((badge) => (
              <FameFrame
                key={badge.id}
                href={badge.href}
                frameTone="violet"
                label="Badge earned"
                labelTone="violet"
                title={badge.title}
                subtitle={badge.subtitle}
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-violet-500/10 via-black/50 to-amber-500/10">
                  <div className="relative h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full border border-amber-400/25">
                    <MediaThumb
                      src={badge.imageUrl}
                      alt={badge.subtitle}
                      courseSlug={badge.courseSlug}
                      className="h-full w-full"
                      contain
                    />
                  </div>
                </div>
              </FameFrame>
            ))}

            {progressFrames.map((course) => {
              const pct = Math.round((course.completed / Math.max(1, course.modules)) * 100);
              return (
                <FameFrame
                  key={`prog-${course.slug}`}
                  href={`/my-learning/course/${encodeURIComponent(course.slug!)}`}
                  frameTone="emerald"
                  label="Completed"
                  labelTone="emerald"
                  title={course.title}
                  subtitle={`${course.completed}/${course.modules} modules`}
                  meta={`${pct}%`}
                >
                  {course.image?.trim() ? (
                    <MediaThumb
                      src={course.image}
                      alt={course.title}
                      courseSlug={course.slug}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-emerald-500/10">
                      <Trophy className="h-9 w-9 text-emerald-400/70" aria-hidden />
                    </div>
                  )}
                </FameFrame>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <LearnerOtherCredentialsUpload
          title="Upload other certificate"
          description="Add badges or certificates from outside SF Trainings (PNG, JPG, or PDF). They appear on this wall and stay in sync with Subscriptions."
          compact
          showList={false}
          onChange={setOtherCredentials}
        />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span>Overall learning progress</span>
          <span className="font-semibold text-white">{overallProgressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFC107] to-amber-400"
            style={{ width: `${overallProgressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">
          {stats.completed} course{stats.completed === 1 ? "" : "s"} fully completed ·{" "}
          {readyCerts.length} certificate{readyCerts.length === 1 ? "" : "s"}
          {badgeOnlyFrames.length > 0
            ? ` · ${badgeOnlyFrames.length} module badge${badgeOnlyFrames.length === 1 ? "" : "s"}`
            : ""}
          {otherCredentials.length > 0
            ? ` · ${otherCredentials.length} uploaded credential${otherCredentials.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
    </section>
  );
}
