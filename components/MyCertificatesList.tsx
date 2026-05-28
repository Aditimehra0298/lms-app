"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Copy, Download, ExternalLink, Linkedin, Loader2, Search } from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";

function statusLabel(c: CertificateRowDto): string {
  if (c.status === "pending") return "Generating your certificate…";
  if (c.status === "failed") return "Generation failed — contact support";
  if (c.status === "ready" && !c.visibleToLearner) return "Awaiting approval";
  return "Ready";
}

export default function MyCertificatesList() {
  const [certificates, setCertificates] = useState<CertificateRowDto[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const email = getLearnerEmail();

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    void fetch(`/api/certificates?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; certificates?: CertificateRowDto[] }) => {
        if (data.ok && data.certificates) setCertificates(data.certificates);
      })
      .finally(() => setLoading(false));
  }, [email]);

  const filtered = certificates.filter(
    (c) =>
      !query.trim() ||
      c.courseTitle.toLowerCase().includes(query.toLowerCase()) ||
      c.certificateNumber.includes(query),
  );

  const canDownload = (c: CertificateRowDto) =>
    c.status === "ready" && c.visibleToLearner && (c.pdfUrl || c.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">My Certificates</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Certificates appear here when your course enables them and you pass the exam. PDFs are generated
          automatically; some courses require admin approval before download.
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
        <p className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-gray-400">No certificates yet. Complete a course and pass the final exam.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-amber-500/25 bg-linear-to-br from-[#1b1305] to-[#0a0a0a] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">
                {c.status === "ready" && c.visibleToLearner ? "Verified" : statusLabel(c)}
              </p>
              <h2 className="mt-1 font-bold text-white">{c.courseTitle}</h2>
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
              {c.status === "pending" ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-amber-200/90">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Your certificate is being prepared…
                </p>
              ) : null}
              {canDownload(c) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.pdfUrl ? (
                    <a
                      href={c.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Open PDF
                    </a>
                  ) : null}
                  {c.verifyUrl ? (
                    <>
                      <a
                        href={buildLinkedInShareUrl(c.verifyUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004182]"
                      >
                        <Linkedin className="h-3.5 w-3.5" aria-hidden />
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
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    View in LMS
                  </Link>
                </div>
              ) : c.status === "ready" && !c.visibleToLearner ? (
                <p className="mt-3 text-xs text-gray-500">Waiting for admin to publish your certificate.</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
