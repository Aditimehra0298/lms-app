"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  Lock,
  Medal,
} from "lucide-react";
import type { CourseCurriculumModule } from "@/lib/content-schema";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { readJsonResponse } from "@/lib/safe-json";
import { readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  DEFAULT_MODULE_EXAM_PASS_PERCENT,
  learnerCredentialsEligible,
  readModuleExamScores,
  type ModuleExamScore,
} from "@/lib/learner-exam-scores";
import { BADGES_UPDATED_EVENT, readLearnerBadges, type LearnerBadge } from "@/lib/learner-badges";
import { downloadUrlAsFile } from "@/lib/share-credentials";
import { certificatePdfDownloadHref } from "@/lib/certificate-pdf-client";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";
import {
  CombinedCertificateTranscriptPrint,
  triggerCombinedCredentialPrint,
  type CombinedCredentialData,
  type TranscriptRow,
} from "@/components/CombinedCertificateTranscriptPrint";
import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";

type Props = {
  courseSlug: string;
  courseTitle: string;
  courseDuration?: string;
  curriculum: CourseCurriculumModule[];
  completedModules: number[];
  combinedExamPercent: number | null;
  allExamsPassed: boolean;
  badgeImageUrl?: string;
  templateImageUrl?: string;
  transcriptTemplateUrl?: string;
  certRequested: boolean;
};

function moduleTitle(module: CourseCurriculumModule, idx: number) {
  return module.title?.trim() || `Module ${idx + 1}`;
}

function buildTranscriptRows(
  curriculum: CourseCurriculumModule[],
  completedModules: number[],
  scores: Record<string, ModuleExamScore>,
): TranscriptRow[] {
  return curriculum.map((mod, idx) => {
    const moduleNumber = idx + 1;
    const done = completedModules.includes(moduleNumber);
    return {
      moduleNumber,
      moduleTitle: moduleTitle(mod, idx),
      status: done ? "Completed" : "Not Started",
      score: scores[String(moduleNumber)] ?? null,
    };
  });
}

export function CourseCompletionRewards({
  courseSlug,
  courseTitle,
  courseDuration,
  curriculum,
  completedModules,
  combinedExamPercent,
  allExamsPassed,
  badgeImageUrl,
  templateImageUrl,
  transcriptTemplateUrl,
  certRequested,
}: Props) {
  const [certificate, setCertificate] = useState<CertificateRowDto | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [badges, setBadges] = useState<LearnerBadge[]>([]);

  const { allModulesDone, examsRequired, eligible } = learnerCredentialsEligible(
    curriculum,
    completedModules,
    allExamsPassed,
  );

  const learnerName = useMemo(() => {
    const profile = readLearnerProfileFromStorage();
    return profile.name?.trim() || profile.email?.split("@")[0] || "Learner";
  }, []);

  useEffect(() => {
    const loadBadges = () => setBadges(readLearnerBadges(courseSlug));
    loadBadges();
    window.addEventListener(BADGES_UPDATED_EVENT, loadBadges);
    return () => window.removeEventListener(BADGES_UPDATED_EVENT, loadBadges);
  }, [courseSlug]);

  useEffect(() => {
    const email = getLearnerEmail();
    if (!email || !eligible) {
      setCertLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/certificates?email=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });
        const data = await readJsonResponse(res, {} as {
          ok?: boolean;
          certificates?: CertificateRowDto[];
        });
        if (cancelled || !data.ok || !data.certificates) return;
        const hit = data.certificates.find((c) => c.courseSlug === courseSlug) ?? null;
        setCertificate(hit);
        if (hit?.status === "pending") setCertLoading(true);
        else setCertLoading(false);
      } catch {
        if (!cancelled) setCertLoading(false);
      }
    };

    void load();
    if (certRequested) {
      const interval = window.setInterval(load, 8000);
      return () => {
        cancelled = true;
        window.clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [courseSlug, eligible, certRequested]);

  if (!allModulesDone) return null;

  const scores = readModuleExamScores(courseSlug);

  if (!eligible) {
    return (
      <section
        id="credentials"
        className="mt-4 rounded-xl border border-amber-400/25 bg-linear-to-br from-amber-500/8 via-[#0c1324] to-[#0a0f1a] p-4"
      >
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200">
          <Lock size={16} /> Certificate & transcript locked
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Almost there</h2>
        <p className="mt-2 text-sm text-gray-300">
          You have completed all {curriculum.length} modules. Pass every module exam at{" "}
          {DEFAULT_MODULE_EXAM_PASS_PERCENT}% or higher to unlock your certificate and transcript.
        </p>
        {examsRequired && combinedExamPercent != null ? (
          <p className="mt-2 text-xs text-amber-100/90">Combined grade so far: {combinedExamPercent}%</p>
        ) : null}
        <Link
          href={`/my-learning/course/${encodeURIComponent(courseSlug)}`}
          className="mt-4 inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Continue course & exams
        </Link>
        {badges.length > 0 ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">
              <Medal size={12} className="mr-1 inline" />
              Module badges earned
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Badges are available now; certificate and transcript unlock after you pass all exams.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  const verifyUrl =
    typeof window !== "undefined"
      ? buildCertificateVerifyUrl(window.location.origin, {
          certificateNumber: certificate?.certificateNumber,
          delegateNumber: certificate?.delegateNumber,
        })
      : "";

  const combinedData: CombinedCredentialData = {
    learnerName,
    courseTitle,
    courseDuration,
    certificateNumber: certificate?.certificateNumber ?? `SFT-${courseSlug.toUpperCase().slice(0, 8)}`,
    issuedAt: certificate?.issuedAt ?? new Date().toISOString(),
    scorePercent: certificate?.scorePercent ?? combinedExamPercent,
    templateImage: templateImageUrl || certificate?.templateImage || "/certificates/haccp-certificate-template.jpg",
    badgeImage: badgeImageUrl || certificate?.badgeImage || undefined,
    transcriptTemplateImage: transcriptTemplateUrl,
    transcriptRows: buildTranscriptRows(curriculum, completedModules, scores),
    nameTopPercent: 38,
    numberTopPercent: 52,
    dateTopPercent: 62,
  };

  const downloadCombinedPdf = () => {
    const href = certificatePdfDownloadHref(certificate?.pdfUrl, getLearnerEmail());
    if (href && certificate?.status === "ready" && certificate.visibleToLearner) {
      downloadUrlAsFile(href, `${courseSlug}-certificate-and-transcript.pdf`);
      return;
    }
    triggerCombinedCredentialPrint();
  };

  const officialPdfHref = certificatePdfDownloadHref(certificate?.pdfUrl, getLearnerEmail());
  const shareText = `I completed ${courseTitle} at SF Trainings!`;

  return (
    <section
      id="credentials"
      className="mt-4 rounded-xl border border-emerald-400/30 bg-linear-to-br from-emerald-500/10 via-[#0c1324] to-violet-950/20 p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <BadgeCheck size={16} /> Course complete — all requirements met
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Your certificate & transcript</h2>
          <p className="mt-1 text-sm text-gray-300">
            You finished every module and passed all exams. Download your certificate and transcript, view
            badges, and share your achievement.
          </p>
          {combinedExamPercent != null ? (
            <p className="mt-1 text-xs text-emerald-200/90">
              Combined exam grade: {combinedExamPercent}%
            </p>
          ) : null}
        </div>
        <Link
          href="/my-learning?tab=certificates"
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-amber-200 hover:bg-white/5"
        >
          All certificates
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-start gap-3">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-amber-300/30 bg-white">
              <Image
                src={combinedData.templateImage}
                alt="Certificate preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                <Award size={14} /> Certificate + Transcript
              </p>
              <p className="mt-1 font-semibold text-white">{courseTitle}</p>
              {certLoading || certificate?.status === "pending" ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-amber-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating official PDF…
                </p>
              ) : certificate?.status === "ready" && certificate.visibleToLearner ? (
                <p className="mt-2 text-xs text-emerald-300">Verified • Ready to download</p>
              ) : certificate?.status === "ready" && !certificate.visibleToLearner ? (
                <p className="mt-2 text-xs text-gray-400">Awaiting admin approval</p>
              ) : (
                <p className="mt-2 text-xs text-gray-400">Preview available — download below</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCombinedPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
            >
              <Download size={16} />
              Download certificate & transcript (PDF)
            </button>
            {officialPdfHref && certificate?.status === "ready" && certificate?.visibleToLearner ? (
              <a
                href={officialPdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
              >
                <FileText size={16} /> Open official PDF
              </a>
            ) : null}
          </div>
          {verifyUrl ? (
            <div className="mt-3">
              <ShareCredentialButtons url={verifyUrl} title={courseTitle} text={shareText} />
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-violet-200">
            <Medal size={14} /> Earned badges
          </p>
          <p className="mt-1 text-sm text-gray-400">One badge per completed module — share on any platform.</p>
          {badges.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No badges recorded yet.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {badges.map((badge) => {
                const badgeShareUrl =
                  verifyUrl || `${window.location.origin}/my-learning/course/${courseSlug}`;
                const badgeShareText = `I earned the "${badge.moduleTitle}" badge in ${badge.courseTitle}!`;
                return (
                  <div
                    key={badge.id}
                    className="rounded-lg border border-violet-300/25 bg-violet-500/10 p-3 text-center"
                  >
                    <div className="relative mx-auto h-16 w-16">
                      {badge.badgeImageUrl ? (
                        <Image
                          src={badge.badgeImageUrl}
                          alt={badge.moduleTitle}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
                          <Medal size={28} />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white">{badge.moduleTitle}</p>
                    <p className="text-[10px] text-gray-400">
                      Module {badge.moduleNumber} • {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2">
                      <ShareCredentialButtons
                        compact
                        url={badgeShareUrl}
                        title={badge.moduleTitle}
                        text={badgeShareText}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>

      <CombinedCertificateTranscriptPrint data={combinedData} />
    </section>
  );
}
