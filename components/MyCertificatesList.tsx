"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Copy, Search, Share2 } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">My Certificates</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Your official certificate and transcript live here. Use Get certificate PDF once to generate
          (~15 seconds) — after that, download or open anytime instantly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course or certificate number…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500/40"
          />
        </div>
        <p className="text-sm text-gray-500">
          <Award className="mr-1 inline h-4 w-4 text-amber-400" aria-hidden />
          {loading ? "…" : `${certificates.length} item${certificates.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!email ? (
        <p className="text-amber-200">Sign in to view your certificates.</p>
      ) : loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-gray-400">No certificates yet. Complete a course and pass the final exam.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => {
            const showDownload = canUseDownloadAction(c);

            return (
              <article
                key={c.id}
                className="rounded-xl border border-amber-500/25 bg-linear-to-br from-[#1b1305] to-[#0a0a0a] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CertificateStatusBadge
                    status={c.status}
                    visibleToLearner={c.visibleToLearner}
                    pdfReady={c.pdfReady}
                  />
                </div>
                <h2 className="mt-2 font-bold text-white">{c.courseTitle}</h2>
                {!c.certificateNumber.startsWith("TEMP-") ? (
                  <p className="mt-2 font-mono text-xs text-violet-200">{c.certificateNumber}</p>
                ) : null}
                {c.delegateNumber ? (
                  <p className="mt-1 font-mono text-[10px] text-amber-200/90">
                    Delegate {c.delegateNumber}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-gray-500">
                  ID {c.identificationNumber}
                  {c.status === "ready" ? ` · ${new Date(c.issuedAt).toLocaleDateString()}` : ""}
                </p>

                {showDownload ? (
                  <div className="mt-4 space-y-3">
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
                    <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {c.verifyUrl ? (
                        <>
                          <a
                            href={buildLinkedInShareUrl(c.verifyUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004182]"
                          >
                            <Share2 className="h-3.5 w-3.5" aria-hidden />
                            LinkedIn
                          </a>
                          <a
                            href={c.verifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                            Verify
                          </a>
                        </>
                      ) : null}
                      <Link
                        href={`/my-learning/certificates/${c.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/10"
                      >
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
                  <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400">
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
