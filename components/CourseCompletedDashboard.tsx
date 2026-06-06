"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  MessageCircle,
  Share2,
  Star,
  Trophy,
} from "lucide-react";
import type { CourseCurriculumModule } from "@/lib/content-schema";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  DEFAULT_MODULE_EXAM_PASS_PERCENT,
  examModuleNumbers,
  learnerCredentialsEligible,
  readModuleExamScores,
  type ModuleExamScore,
} from "@/lib/learner-exam-scores";
import { getFirstExamRowInModule, learnerExamDisplayLabel } from "@/lib/my-learning-exams";
import { moduleCurriculumRows, type PreviewGateModule } from "@/lib/learner-preview-gate";
import { readJsonResponse } from "@/lib/safe-json";
import {
  buildBadgeShareText,
  buildCertificateEarnedPageUrl,
} from "@/lib/certificate-share-url";
import {
  buildCertificateVerifyUrl,
  buildLinkedInShareUrl,
} from "@/lib/certificate-verify-url";
import {
  CertificateDownloadActions,
  CertificateStatusBadge,
} from "@/components/CertificateDownloadActions";
import {
  certificatePdfDownloadHref,
  fetchSavedCertificatePdf,
  savePdfBlob,
} from "@/lib/certificate-pdf-client";
import { CompletionSuggestedCourses } from "@/components/CompletionSuggestedCourses";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";
import { ShareableBadgeCard } from "@/components/ShareableBadgeCard";

type Props = {
  courseSlug: string;
  courseTitle: string;
  courseDuration?: string;
  curriculum: CourseCurriculumModule[];
  completedModules: number[];
  combinedExamPercent: number | null;
  allExamsPassed: boolean;
  templateImageUrl?: string;
  badgeImageUrl?: string;
  certRequested: boolean;
};

const CARD = "rounded-xl border border-white/[0.08] bg-[#141820]";

const COMPLETION_CELEBRATION_IMAGE =
  "https://res.cloudinary.com/dwnnakrrh/image/upload/v1780658981/ChatGPT_Image_Jun_5_2026_04_58_15_PM_e96iy7.png";

function moduleTitle(module: CourseCurriculumModule, idx: number) {
  return module.title?.trim() || `Module ${idx + 1}`;
}

function formatModuleLessonMix(module: CourseCurriculumModule): string {
  const rows = moduleCurriculumRows(module as PreviewGateModule);
  const parts: string[] = [];
  const videos = rows.filter((row) => row.kind === "video").length;
  const readings = rows.filter((row) => row.kind === "reading").length;
  const exams = rows.filter((row) => row.kind === "exam").length;
  if (videos) parts.push(`${videos} video${videos === 1 ? "" : "s"}`);
  if (readings) parts.push(`${readings} reading${readings === 1 ? "" : "s"}`);
  if (exams) parts.push(`${exams} assessment${exams === 1 ? "" : "s"}`);
  return parts.join(" · ") || "No lessons listed";
}

function formatExamScoreLabel(score: ModuleExamScore | undefined): string {
  if (!score) return "Not attempted";
  const base = `${score.percent}% (${score.correct}/${score.total} correct)`;
  return score.passed ? `${base} — Passed` : `${base} — Did not pass`;
}

/** PDF viewer params — page fills the preview box edge-to-edge. */
function certificatePdfEmbedSrc(base: string): string {
  const params = "page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0";
  return base.includes("#") ? `${base}&${params}` : `${base}#${params}`;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percent) / 100) * c;
  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="9"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{Math.round(percent)}%</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
          Completed
        </span>
      </div>
    </div>
  );
}

function OutlineBtn({
  href,
  onClick,
  children,
  disabled,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-white/35 hover:bg-white/5 disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function CourseCompletedDashboard({
  courseSlug,
  courseTitle,
  curriculum,
  completedModules,
  combinedExamPercent,
  allExamsPassed,
  templateImageUrl,
  badgeImageUrl,
  certRequested,
}: Props) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [certificate, setCertificate] = useState<CertificateRowDto | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [moduleExamScores, setModuleExamScores] = useState<Record<string, ModuleExamScore>>({});

  const { examsRequired, eligible } = learnerCredentialsEligible(
    curriculum,
    completedModules,
    allExamsPassed,
  );

  const certificateIssued = Boolean(
    certificate?.status === "ready" && certificate.visibleToLearner !== false,
  );
  const canViewCertificate = eligible || certificateIssued;

  const examModules = useMemo(() => examModuleNumbers(curriculum), [curriculum]);

  useEffect(() => {
    const refreshScores = () => setModuleExamScores(readModuleExamScores(courseSlug));
    refreshScores();
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ courseSlug?: string }>).detail;
      if (!detail?.courseSlug || detail.courseSlug === courseSlug) refreshScores();
    };
    window.addEventListener("sft-exam-scores-updated", onUpdate);
    window.addEventListener("storage", refreshScores);
    return () => {
      window.removeEventListener("sft-exam-scores-updated", onUpdate);
      window.removeEventListener("storage", refreshScores);
    };
  }, [courseSlug]);

  const passedExams = useMemo(() => {
    return examModules.filter((n) => moduleExamScores[String(n)]?.passed).length;
  }, [examModules, moduleExamScores]);

  const scorePercent = certificate?.scorePercent ?? combinedExamPercent ?? 100;
  const completedOn = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const effectiveEmail =
    certificate?.learnerEmail?.trim().toLowerCase() || getLearnerEmail()?.trim().toLowerCase() || "";

  const hasSavedPdf = Boolean(
    certificate?.pdfReady ||
      certificate?.pdfUrl?.trim().startsWith("/api/certificates/") ||
      (certificate?.id && certificate.status === "ready"),
  );

  const templateImage =
    templateImageUrl ||
    certificate?.templateImage ||
    "/certificates/haccp-certificate-template.jpg";

  const reloadCertificate = useCallback(async () => {
    const email = getLearnerEmail();
    if (!email) return null;
    const res = await fetch(`/api/certificates?email=${encodeURIComponent(email)}`, {
      cache: "no-store",
    });
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      certificates?: CertificateRowDto[];
    });
    if (data.ok && data.certificates) {
      const hit = data.certificates.find((c) => c.courseSlug === courseSlug) ?? null;
      setCertificate(hit);
      return hit;
    }
    return null;
  }, [courseSlug]);

  const courseBadgeUrl = badgeImageUrl?.trim() || certificate?.badgeImage?.trim() || "";

  useEffect(() => {
    const email = getLearnerEmail();
    if (!email) return;
    void fetch(`/api/courses/${encodeURIComponent(courseSlug)}/reviews?email=${encodeURIComponent(email)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { reviews?: Array<{ isMine?: boolean; rating?: number }> }) => {
        const mine = d.reviews?.find((r) => r.isMine);
        if (mine?.rating) setMyRating(mine.rating);
      })
      .catch(() => undefined);
  }, [courseSlug]);

  useEffect(() => {
    let cancelled = false;
    const minLoad = new Promise((r) => window.setTimeout(r, 1400));
    void Promise.all([reloadCertificate(), minLoad]).then(() => {
      if (!cancelled) setPhase("ready");
    });
    if (certRequested) {
      const interval = window.setInterval(() => void reloadCertificate(), 8000);
      return () => {
        cancelled = true;
        window.clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [certRequested, reloadCertificate]);

  const inlinePdfHref =
    certificate?.id && effectiveEmail
      ? certificatePdfDownloadHref(
          certificate.pdfUrl ?? `/api/certificates/${encodeURIComponent(certificate.id)}/pdf`,
          effectiveEmail,
          { attachment: false },
        )
      : null;

  const inlinePdfPreviewSrc = inlinePdfHref ? certificatePdfEmbedSrc(inlinePdfHref) : null;

  useEffect(() => {
    if (!certificate?.id || !effectiveEmail || !hasSavedPdf || inlinePdfPreviewSrc) {
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfPreviewError(null);
      setPdfPreviewLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setPdfPreviewLoading(true);
    setPdfPreviewError(null);

    void fetchSavedCertificatePdf(certificate.id, effectiveEmail, { attachment: false })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setPdfPreviewError(result.message);
          setPdfPreviewUrl(null);
          return;
        }
        objectUrl = URL.createObjectURL(result.blob);
        setPdfPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch(() => {
        if (!cancelled) setPdfPreviewError("Could not load your certificate PDF.");
      })
      .finally(() => {
        if (!cancelled) setPdfPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    certificate?.id,
    certificate?.pdfReady,
    certificate?.pdfUrl,
    effectiveEmail,
    hasSavedPdf,
    inlinePdfPreviewSrc,
  ]);

  const handleQuickDownload = async () => {
    const email = effectiveEmail;
    const id = certificate?.id;
    if (!email || !id) return;
    setDownloading(true);
    try {
      const result = await fetchSavedCertificatePdf(id, email, { attachment: true });
      if (result.ok) savePdfBlob(result.blob, `${courseSlug}-certificate.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const verifyUrl =
    certificate?.verifyUrl?.trim() ||
    (typeof window !== "undefined"
      ? buildCertificateVerifyUrl(window.location.origin, {
          certificateNumber: certificate?.certificateNumber,
          delegateNumber: certificate?.delegateNumber,
        })
      : "");

  const viewPdfHref = certificate?.id
    ? `/my-learning/certificates/${encodeURIComponent(certificate.id)}/view-pdf?email=${encodeURIComponent(effectiveEmail)}`
    : "#credentials";

  const badgeShareUrl =
    typeof window !== "undefined" && certificate
      ? buildCertificateEarnedPageUrl(window.location.origin, certificate)
      : typeof window !== "undefined"
        ? `${window.location.origin}/my-learning/course/${courseSlug}`
        : "";

  const shareText = certificate
    ? buildBadgeShareText({
        learnerName: certificate.learnerName,
        courseTitle,
      })
    : `I completed ${courseTitle} at SF Trainings! View my official certificate PDF:`;

  if (phase === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
        <div className="relative">
          <Loader2 className="h-14 w-14 animate-spin text-emerald-400" aria-hidden />
          <Trophy className="absolute inset-0 m-auto h-6 w-6 text-amber-300" aria-hidden />
        </div>
        <p className="text-lg font-semibold text-white">Preparing your completion summary…</p>
        <p className="max-w-sm text-center text-sm text-gray-400">
          All {curriculum.length} modules complete — loading certificate & progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <Link href="/my-learning?tab=dashboard" className="hover:text-amber-200">
          My Learning
        </Link>
        <ChevronRight size={12} className="text-gray-600" />
        <Link href="/my-learning?tab=learning" className="hover:text-amber-200">
          Courses
        </Link>
        <ChevronRight size={12} className="text-gray-600" />
        <span className="text-gray-300">{courseTitle}</span>
      </nav>

      {/* Title */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white md:text-[1.65rem]">{courseTitle}</h1>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <CheckCircle2 size={12} /> Completed
        </span>
      </div>

      {/* Congratulations banner */}
      <section className={`${CARD} relative overflow-hidden p-5 md:p-6`}>
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 15% 50%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(ellipse at 85% 30%, rgba(34,197,94,0.08) 0%, transparent 45%)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-4 md:gap-5">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/50 lg:hidden">
                <Trophy className="h-9 w-9 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-amber-400">Congratulations!</p>
                <p className="mt-0.5 text-sm text-gray-300">You have successfully completed</p>
                <p className="mt-1 text-lg font-bold text-white">{courseTitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="text-gray-400">
                    Completed On: <span className="font-semibold text-white">{completedOn}</span>
                  </span>
                  {eligible && combinedExamPercent != null ? (
                    <span className="text-gray-400">
                      Score: <span className="font-semibold text-white">{scorePercent}%</span>
                    </span>
                  ) : null}
                  {eligible ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[11px] font-bold text-white">
                      <BadgeCheck size={11} /> Passed
                    </span>
                  ) : examsRequired ? (
                    <span className="text-amber-300 text-xs">Exams pending</span>
                  ) : null}
                </div>
              </div>
            </div>

            {canViewCertificate ? (
              <div className="relative mt-5 flex flex-wrap gap-2">
                <Link
                  href={viewPdfHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-black shadow-sm hover:bg-amber-400"
                >
                  <Award size={16} /> View Certificate
                </Link>
                <button
                  type="button"
                  disabled={downloading || !certificate?.id}
                  onClick={() => void handleQuickDownload()}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Download Certificate (PDF)
                </button>
                <OutlineBtn href="#module-results">
                  <FileText size={16} /> View Transcript
                </OutlineBtn>
                {verifyUrl ? (
                  <OutlineBtn href={buildLinkedInShareUrl(verifyUrl)}>
                    <Share2 size={16} /> Share on LinkedIn
                  </OutlineBtn>
                ) : null}
              </div>
            ) : (
              <div className="relative mt-5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm text-amber-100">
                  <Lock size={15} />
                  Pass all module exams at {DEFAULT_MODULE_EXAM_PASS_PERCENT}%+ to unlock your certificate.
                </p>
              </div>
            )}
          </div>

          <div className="relative mx-auto h-44 w-44 shrink-0 sm:h-52 sm:w-52 lg:mx-0 lg:h-56 lg:w-56">
            <Image
              src={COMPLETION_CELEBRATION_IMAGE}
              alt="Course completed — celebration trophy and graduation cap"
              fill
              unoptimized
              priority
              className="object-contain"
              sizes="(max-width: 1024px) 208px, 224px"
            />
          </div>
        </div>
      </section>

      {/* Two-column: certificate height follows page / sidebar length */}
      <section className="grid items-stretch gap-4 lg:min-h-[calc(100dvh-15rem)] lg:grid-cols-[1.65fr_1fr]">
        <article id="credentials" className={`${CARD} flex h-full min-h-0 flex-col p-5`}>
          <div className="shrink-0 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">Your Certificate</h2>
              {certificate ? (
                <div className="mt-1 space-y-0.5">
                  {!certificate.certificateNumber.startsWith("TEMP-") ? (
                    <p className="font-mono text-xs text-violet-200">
                      {certificate.certificateNumber}
                    </p>
                  ) : null}
                  {certificate.delegateNumber ? (
                    <p className="font-mono text-[10px] text-amber-200/90">
                      Delegate {certificate.delegateNumber}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-gray-500">
                    Same certificate as in{" "}
                    <Link
                      href="/my-learning?tab=certificates"
                      className="text-amber-300 hover:underline"
                    >
                      Certificate Records
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
            {certificate ? (
              <CertificateStatusBadge
                status={certificate.status}
                visibleToLearner={certificate.visibleToLearner}
                pdfReady={certificate.pdfReady}
              />
            ) : null}
          </div>

          {canViewCertificate ? (
            <>
              <div className="relative mt-3 min-h-[min(72vw,480px)] w-full flex-1 overflow-hidden rounded-lg border border-white/10 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.45)] lg:min-h-[420px]">
                {pdfPreviewLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a1a1a] text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                    <p className="text-xs">Loading your official certificate…</p>
                  </div>
                ) : inlinePdfPreviewSrc && hasSavedPdf ? (
                  <iframe
                    src={inlinePdfPreviewSrc}
                    title="Your official certificate PDF"
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                  />
                ) : pdfPreviewUrl ? (
                  <iframe
                    src={certificatePdfEmbedSrc(`${pdfPreviewUrl}`)}
                    title="Your official certificate PDF"
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="absolute inset-0 bg-white">
                    <Image
                      src={templateImage}
                      alt="Certificate template preview"
                      fill
                      unoptimized
                      className="object-cover opacity-95"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4 text-center">
                      <p className="text-sm font-semibold text-white">
                        Generate your official certificate
                      </p>
                      <p className="mt-1 text-xs text-gray-300">
                        First time only (~15 seconds). Then it appears here and in Certificate
                        Records.
                      </p>
                    </div>
                  </div>
                )}
                {pdfPreviewError ? (
                  <p className="absolute inset-x-0 bottom-0 border-t border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {pdfPreviewError}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 shrink-0 border-t border-white/[0.06] pt-3">
                {hasSavedPdf ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        disabled={downloading || !certificate?.id}
                        onClick={() => void handleQuickDownload()}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        <Download size={14} /> Download PDF
                      </button>
                      {verifyUrl ? (
                        <Link
                          href={verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"
                        >
                          <ExternalLink size={14} /> Verify Certificate
                        </Link>
                      ) : null}
                    </div>
                    {badgeShareUrl || verifyUrl ? (
                      <ShareCredentialButtons
                        compact
                        url={badgeShareUrl || verifyUrl}
                        title={courseTitle}
                        text={shareText}
                        badgeImageUrl={courseBadgeUrl}
                      />
                    ) : null}
                  </div>
                ) : (
                  <CertificateDownloadActions
                    certificateId={certificate?.id}
                    learnerEmail={certificate?.learnerEmail ?? effectiveEmail}
                    courseSlug={courseSlug}
                    courseTitle={courseTitle}
                    scorePercent={scorePercent}
                    pdfReady={certificate?.pdfReady}
                    pdfUrl={certificate?.pdfUrl}
                    onComplete={() => void reloadCertificate()}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 p-8 text-center">
              <Lock className="h-10 w-10 text-gray-500" />
              <p className="mt-3 text-sm font-semibold text-gray-300">Certificate locked</p>
              <p className="mt-1 text-xs text-gray-500">
                {passedExams}/{examModules.length} assessments passed
              </p>
            </div>
          )}
        </article>

        <aside className="flex h-full min-h-0 flex-col space-y-4">
          {/* Your Progress */}
          <article className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-white">Your Progress</h3>
            <div className="mt-3 flex items-center gap-5">
              <ProgressRing percent={100} />
              <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-gray-400">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Modules
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {completedModules.length}/{curriculum.length}
                  </span>
                </li>
                {examModules.length > 0 ? (
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-gray-400">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Assessments
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {passedExams}/{examModules.length}
                    </span>
                  </li>
                ) : null}
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-gray-400">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Final Exam
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {eligible ? "Passed" : "Pending"}
                  </span>
                </li>
              </ul>
            </div>
          </article>

          {/* Course badge — same image for every learner; certificate PDF personalizes */}
          <article
            className={`${CARD} relative overflow-hidden px-4 py-6`}
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 50%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent"
              aria-hidden
            />
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/70">
              Course Badge
            </p>
            {courseBadgeUrl ? (
              <ShareableBadgeCard
                title={courseTitle}
                subtitle={certificateIssued ? "Certified" : "Official course badge"}
                imageUrl={courseBadgeUrl}
                shareUrl={badgeShareUrl || verifyUrl}
                shareText={shareText}
                courseSlug={courseSlug}
                className="mx-auto w-full"
              />
            ) : (
              <p className="mt-4 text-center text-xs text-gray-500">
                No badge uploaded for this course yet. Add one in Admin → Courses → Certificate.
              </p>
            )}
          </article>

          <article className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-white">Your results</h3>
            <p className="mt-2 text-xs text-gray-400">
              {completedModules.length}/{curriculum.length} modules completed
              {combinedExamPercent != null ? (
                <>
                  {" "}
                  · combined score{" "}
                  <span className="font-semibold text-emerald-300">{combinedExamPercent}%</span>
                </>
              ) : null}
            </p>
            <a
              href="#module-results"
              className="mt-3 inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200"
            >
              View full module breakdown ↓
            </a>
          </article>

          {/* Certificate Status */}
          {certificate && eligible ? (
            <article className={`${CARD} border-emerald-500/20 p-4`}>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300">Issued!</h3>
              </div>
              <dl className="mt-3 space-y-1.5 text-xs text-gray-400">
                {certificate.certificateNumber &&
                !certificate.certificateNumber.startsWith("TEMP-") ? (
                  <div>
                    <dt className="text-gray-500">Certificate ID</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-amber-200/90">
                      {certificate.certificateNumber}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-gray-500">Issue Date</dt>
                  <dd className="mt-0.5 text-white">{completedOn}</dd>
                </div>
              </dl>
              <Link
                href={viewPdfHref}
                target="_blank"
                className="mt-3 flex w-full items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20"
              >
                View Certificate
              </Link>
            </article>
          ) : null}

          {/* Quick Tools */}
          <article className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-white">Quick Tools</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Course Details", icon: BookOpen, href: `/courses/${courseSlug}` },
                { label: "Download", icon: Download, href: viewPdfHref },
                { label: "My Notes", icon: FileText, href: `/my-learning/course/${encodeURIComponent(courseSlug)}` },
                { label: "Ask Mentor", icon: MessageCircle, href: `/contact` },
              ].map(({ label, icon: Icon, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/20 py-3 text-[10px] font-semibold text-gray-400 transition hover:border-white/15 hover:text-gray-200"
                >
                  <Icon size={18} className="text-amber-400/70" />
                  {label}
                </Link>
              ))}
            </div>
          </article>

          {/* Need Help? */}
          <article className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-white">Need Help?</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/contact"
                className="rounded-lg border border-white/15 py-2.5 text-center text-xs font-semibold text-gray-300 hover:bg-white/5"
              >
                Contact Support
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/15 py-2.5 text-center text-xs font-semibold text-gray-300 hover:bg-white/5"
              >
                Ask Mentor
              </Link>
            </div>
          </article>

          {/* Your Feedback */}
          <article className={`${CARD} p-4`}>
            <h3 className="text-sm font-bold text-white">Your Feedback</h3>
            <div className="mt-2 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={18}
                  className={
                    n <= (myRating || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-600"
                  }
                />
              ))}
            </div>
            <Link
              href={`/courses/${encodeURIComponent(courseSlug)}#qa`}
              className="mt-3 inline-block text-xs font-semibold text-violet-300 hover:text-violet-200"
            >
              Edit Review
            </Link>
          </article>
        </aside>
      </section>

      <section id="module-results" className={`${CARD} p-5`}>
        <div id="transcript" className="scroll-mt-24" aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Module completion &amp; scores</h2>
            <p className="mt-1 text-xs text-gray-400">
              Full breakdown of every module and assessment in this course.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
              Overall score
            </p>
            <p className="text-lg font-bold text-emerald-200">{scorePercent}%</p>
            {examModules.length > 0 ? (
              <p className="text-[10px] text-gray-400">
                {passedExams}/{examModules.length} assessments passed
              </p>
            ) : null}
          </div>
        </div>

        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {curriculum.map((mod, idx) => {
            const moduleNumber = idx + 1;
            const done = completedModules.includes(moduleNumber);
            const examRow = getFirstExamRowInModule(mod);
            const hasExam = Boolean(examRow);
            const examScore = moduleExamScores[String(moduleNumber)];
            const lessonMix = formatModuleLessonMix(mod);
            const subModuleCount = mod.subModules?.length ?? 0;

            return (
              <li
                key={`module-result-${moduleNumber}`}
                className="rounded-xl border border-white/[0.08] bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                      Module {moduleNumber}
                      {subModuleCount > 0
                        ? ` · ${subModuleCount} sub-module${subModuleCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    <h3 className="mt-1 text-sm font-bold leading-snug text-white">
                      {moduleTitle(mod, idx)}
                    </h3>
                    <p className="mt-2 text-xs text-gray-400">{lessonMix}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                      done ? "bg-emerald-600/85 text-white" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {done ? "Completed" : "Incomplete"}
                  </span>
                </div>

                {hasExam ? (
                  <div
                    className={`mt-3 rounded-lg border px-3 py-2.5 ${
                      examScore?.passed
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : examScore
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Assessment score
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {learnerExamDisplayLabel(
                        examRow?.label,
                        `Module ${moduleNumber} assessment`,
                      )}
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        examScore?.passed
                          ? "text-emerald-300"
                          : examScore
                            ? "text-amber-200"
                            : "text-gray-500"
                      }`}
                    >
                      {formatExamScoreLabel(examScore)}
                      {examScore && !examScore.passed
                        ? ` (pass mark ${DEFAULT_MODULE_EXAM_PASS_PERCENT}%)`
                        : null}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">No assessment for this module.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${CARD} p-5`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Explore more courses</h2>
            <p className="mt-1 text-xs text-gray-400">
              Continue learning with other trainings from our catalog.
            </p>
          </div>
          <Link
            href="/courses"
            className="text-xs font-semibold text-violet-300 hover:text-violet-200"
          >
            View all →
          </Link>
        </div>
        <CompletionSuggestedCourses excludeSlug={courseSlug} />
      </section>
    </div>
  );
}
