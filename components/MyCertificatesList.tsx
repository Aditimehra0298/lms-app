"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { SocialBrandIcon } from "@/components/SocialBrandIcon";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { buildBadgeShareText, buildCertificateEarnedPageUrl } from "@/lib/certificate-share-url";
import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";
import {
  CertificateDownloadActions,
  CertificateStatusBadge,
} from "@/components/CertificateDownloadActions";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";
import { readJsonResponse } from "@/lib/safe-json";

function canUseDownloadAction(c: CertificateRowDto): boolean {
  if (c.status === "ready" && !c.visibleToLearner) return false;
  return c.status === "ready" || c.status === "pending" || c.status === "failed";
}

export default function MyCertificatesList() {
  const [certificates, setCertificates] = useState<CertificateRowDto[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const email = getLearnerEmail();

  const reloadCertificates = async () => {
    if (!email) return;
    try {
      const res = await fetch(`/api/certificates?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
      });
      const data = await readJsonResponse(res, {} as {
        ok?: boolean;
        certificates?: CertificateRowDto[];
      });
      if (data.ok && data.certificates) setCertificates(data.certificates);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    void (async () => {
      await reloadCertificates();
      setLoading(false);
    })();
  }, [email]);

  const filtered = certificates.filter(
    (c) =>
      !query.trim() ||
      c.courseTitle.toLowerCase().includes(query.toLowerCase()) ||
      c.certificateNumber.includes(query),
  );

  return (
    <div className="my-learning-certificates space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">My Certificates</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
          Your official certificate and transcript live here. Generate your PDF once (~15 seconds) —
          later downloads are instant.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="my-learning-certificate-search-icon absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course or certificate number…"
            className="my-learning-certificate-search w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/15"
          />
        </div>
        <p className="my-learning-certificate-count inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-500">
          <Award className="h-4 w-4 text-amber-400" aria-hidden />
          {loading ? "…" : `${certificates.length} item${certificates.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!email ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Sign in to view your certificates.
        </p>
      ) : loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="my-learning-certificate-empty rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
          <Award className="mx-auto h-10 w-10 text-gray-600" aria-hidden />
          <p className="mt-3 text-sm text-gray-400">
            No certificates yet. Complete a course and pass the final exam.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((c) => {
            const showDownload = canUseDownloadAction(c);
            const issuedLabel =
              c.status === "ready"
                ? new Date(c.issuedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

            return (
              <article
                key={c.id}
                className="my-learning-certificate-card flex h-full flex-col rounded-2xl border border-white/10 bg-[#141820] p-5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <CertificateStatusBadge
                    status={c.status}
                    visibleToLearner={c.visibleToLearner}
                    pdfReady={c.pdfReady}
                  />
                  {issuedLabel ? (
                    <time className="shrink-0 text-[11px] text-gray-500" dateTime={c.issuedAt}>
                      {issuedLabel}
                    </time>
                  ) : null}
                </div>

                <h2 className="mt-3 text-lg font-bold leading-snug text-white">{c.courseTitle}</h2>

                {!c.certificateNumber.startsWith("TEMP-") ? (
                  <p className="my-learning-certificate-number mt-2 font-mono text-xs font-medium text-violet-200">
                    {c.certificateNumber}
                  </p>
                ) : null}

                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                  {c.delegateNumber ? (
                    <span className="font-mono text-amber-200/90">Delegate {c.delegateNumber}</span>
                  ) : null}
                  <span>ID {c.identificationNumber}</span>
                </div>

                {showDownload ? (
                  <div className="mt-5 flex flex-1 flex-col">
                    <div className="my-learning-certificate-actions rounded-xl border border-white/8 bg-black/20 p-3">
                      <CertificateDownloadActions
                        certificateId={c.id}
                        learnerEmail={c.learnerEmail}
                        courseSlug={c.courseSlug}
                        courseTitle={c.courseTitle}
                        scorePercent={c.scorePercent}
                        pdfReady={c.pdfReady}
                        pdfUrl={c.pdfUrl}
                        size="sm"
                        onComplete={() => void reloadCertificates()}
                      />
                    </div>

                    <div className="my-learning-certificate-share mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                      {c.verifyUrl ? (
                        <>
                          <a
                            href={buildLinkedInShareUrl(c.verifyUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="my-learning-cert-share-linkedin inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#004182]"
                          >
                            <SocialBrandIcon brand="linkedin" size={14} className="shrink-0 text-white" />
                            LinkedIn
                          </a>
                          <a
                            href={c.verifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="my-learning-cert-share-verify inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Verify
                          </a>
                        </>
                      ) : null}
                      <Link
                        href={`/my-learning/certificates/${c.id}`}
                        className="my-learning-cert-share-view inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        View in LMS
                      </Link>
                      {c.verifyUrl || c.delegateNumber || c.certificateNumber ? (
                        <ShareCredentialButtons
                          compact
                          url={
                            typeof window !== "undefined"
                              ? buildCertificateEarnedPageUrl(window.location.origin, c)
                              : c.verifyUrl ?? ""
                          }
                          title={c.courseTitle}
                          text={buildBadgeShareText({
                            learnerName: c.learnerName,
                            courseTitle: c.courseTitle,
                          })}
                          badgeImageUrl={c.badgeImage?.trim()}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : c.status === "ready" && !c.visibleToLearner ? (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-gray-400">
                    Waiting for admin to publish your certificate.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
