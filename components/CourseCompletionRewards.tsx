"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, BadgeCheck, Loader2, Lock, Medal } from "lucide-react";
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
import {
  CertificateDownloadActions,
  CertificateStatusBadge,
} from "@/components/CertificateDownloadActions";
import { N8nCertificateGenerationStatus } from "@/components/N8nCertificateGenerationStatus";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";
import { ShareableBadgeCard } from "@/components/ShareableBadgeCard";
import {
  CombinedCertificateTranscriptPrint,
  type CombinedCredentialData,
  type TranscriptRow,
} from "@/components/CombinedCertificateTranscriptPrint";
import {
  buildBadgeShareText,
  buildCertificateEarnedPageUrl,
} from "@/lib/certificate-share-url";
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
        {badgeImageUrl?.trim() ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">
              <Medal size={12} className="mr-1 inline" />
              Course badge ready
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Same badge for every learner — certificate unlocks after you pass all exams.
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

  const reloadCertificate = async () => {
    const email = getLearnerEmail();
    if (!email) return;
    try {
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
      }
    } catch {
      /* ignore */
    }
  };

  const earnedShareUrl =
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
  const downloadBlocked =
    certificate?.status === "ready" && !certificate.visibleToLearner;

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
            Get your official certificate and transcript below. First time takes about 15 seconds;
            after that it is saved and opens instantly.
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

      <div className="mt-4 space-y-4">
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  <Award size={14} /> Certificate + Transcript
                </p>
                {certLoading ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-200">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Loading…
                  </span>
                ) : (
                  <CertificateStatusBadge
                    status={certificate?.status}
                    visibleToLearner={certificate?.visibleToLearner}
                    pdfReady={certificate?.pdfReady}
                  />
                )}
              </div>
              <p className="mt-1 font-semibold text-white">{courseTitle}</p>
              {!certificate && !certLoading ? (
                <p className="mt-2 text-xs text-gray-400">
                  Click Get certificate PDF to generate your official document. Later downloads are
                  instant.
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <N8nCertificateGenerationStatus
              certificate={certificate}
              certRequested={certRequested}
              polling={certLoading || (certRequested && certificate?.status === "pending")}
            />
          </div>
          <div className="mt-4">
            <CertificateDownloadActions
              certificateId={certificate?.id}
              learnerEmail={certificate?.learnerEmail}
              courseSlug={courseSlug}
              courseTitle={courseTitle}
              scorePercent={certificate?.scorePercent ?? combinedExamPercent}
              pdfReady={certificate?.pdfReady}
              pdfUrl={certificate?.pdfUrl}
              templateImageUrl={templateImageUrl}
              disabled={downloadBlocked}
              disabledReason={
                downloadBlocked
                  ? "Your certificate is awaiting admin approval before download."
                  : undefined
              }
              onComplete={() => void reloadCertificate()}
            />
          </div>
          {verifyUrl ? (
            <div className="mt-3">
              <ShareCredentialButtons
                url={earnedShareUrl || verifyUrl}
                title={courseTitle}
                text={shareText}
                badgeImageUrl={badgeImageUrl?.trim() || certificate?.badgeImage?.trim()}
              />
            </div>
          ) : null}
        </article>

        <article
          className="relative overflow-hidden rounded-xl border border-amber-500/20 px-4 py-8 sm:px-8"
          style={{
            background:
              "linear-gradient(165deg, rgba(245,158,11,0.07) 0%, rgba(20,24,32,0.95) 38%, rgba(88,28,135,0.08) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
            aria-hidden
          />
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/80">
            <Medal size={12} className="mr-1.5 inline -mt-0.5" aria-hidden />
            Your course badge
          </p>
          {badgeImageUrl?.trim() || certificate?.badgeImage?.trim() ? (
            <ShareableBadgeCard
              title={courseTitle}
              subtitle="Share your achievement"
              imageUrl={badgeImageUrl?.trim() || certificate?.badgeImage?.trim()}
              shareUrl={earnedShareUrl || verifyUrl || `${window.location.origin}/my-learning/course/${courseSlug}`}
              shareText={shareText}
              courseSlug={courseSlug}
              className="mx-auto w-full max-w-md"
            />
          ) : (
            <p className="mt-4 text-center text-sm text-gray-500">
              Upload a course badge in Admin → Courses → Certificate for this course.
            </p>
          )}
        </article>
      </div>

      <CombinedCertificateTranscriptPrint data={combinedData} />
    </section>
  );
}
