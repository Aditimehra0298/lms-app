"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Copy,
  Download,
  Mail,
  Search,
  Share2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import type { IssuedCertificateDto } from "@/lib/certificate-types";
import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { readJsonResponse } from "@/lib/safe-json";

type VerifyResponse = {
  ok?: boolean;
  verified?: boolean;
  message?: string;
  certificate?: IssuedCertificateDto;
};

function VerifyContent({ isLight }: { isLight: boolean }) {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get("number")?.trim() ?? "";
  const initialQ = searchParams.get("q")?.trim() ?? "";
  const initialEmail = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [query, setQuery] = useState(initialNumber || initialQ);
  const [certificate, setCertificate] = useState<IssuedCertificateDto | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const card = isLight
    ? "rounded-2xl border border-[#b4965a]/30 bg-white/90 p-6 shadow-sm"
    : "rounded-2xl border border-white/10 bg-[#141414] p-6";
  const label = isLight ? "text-slate-700" : "text-gray-300";
  const muted = isLight ? "text-slate-500" : "text-gray-500";
  const input = isLight
    ? "w-full rounded-xl border border-[#b4965a]/35 bg-[#f8f4ec] py-3 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#9a7222]"
    : "w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-500/40";
  const detailBox = isLight
    ? "mt-6 space-y-3 rounded-xl border border-[#b4965a]/20 bg-[#f8f4ec]/80 p-4 text-left text-sm"
    : "mt-6 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left text-sm";
  const strong = isLight ? "text-slate-900" : "text-white";
  const body = isLight ? "text-slate-800" : "text-gray-200";

  const runVerify = useCallback(async (emailRaw: string, certRaw: string) => {
    const emailValue = emailRaw.trim().toLowerCase();
    const certValue = certRaw.trim();
    if (!emailValue || !certValue) {
      setStatus("idle");
      setCertificate(null);
      setMessage("");
      return;
    }
    if (!emailValue.includes("@")) {
      setStatus("fail");
      setCertificate(null);
      setMessage("Enter a valid email address (Gmail or the email used for the course).");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const params = new URLSearchParams({
        email: emailValue,
        number: certValue,
      });
      const res = await fetch(`/api/certificates/verify?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readJsonResponse(res, {} as VerifyResponse);
      if (data.ok && data.certificate) {
        setCertificate(data.certificate);
        setStatus("ok");
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("email", emailValue);
        url.searchParams.set("number", data.certificate.certificateNumber);
        window.history.replaceState({}, "", url.toString());
      } else {
        setCertificate(null);
        setStatus("fail");
        setMessage(
          data.message ?? "No certificate matches this email and certificate number.",
        );
      }
    } catch {
      setCertificate(null);
      setStatus("fail");
      setMessage("Verification service is temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    const seedCert = initialNumber || initialQ;
    if (initialEmail && seedCert) void runVerify(initialEmail, seedCert);
  }, [initialNumber, initialQ, initialEmail, runVerify]);

  const verifyPageUrl =
    typeof window !== "undefined" && certificate?.certificateNumber
      ? `${window.location.origin}/certificates/verify?number=${encodeURIComponent(certificate.certificateNumber)}${
          email.trim() ? `&email=${encodeURIComponent(email.trim().toLowerCase())}` : ""
        }`
      : "";

  const certificateDownloadUrl = certificate?.certificateNumber
    ? `/api/certificates/public-pdf?number=${encodeURIComponent(certificate.certificateNumber)}&download=1`
    : "";

  const copyLink = async () => {
    if (!verifyPageUrl) return;
    await navigator.clipboard.writeText(verifyPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canSubmit = Boolean(email.trim() && query.trim() && status !== "loading");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <form
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          void runVerify(email, query);
        }}
      >
        <label className={`block text-sm font-medium ${label}`}>
          Email address (Gmail / registered email)
          <div className="relative mt-2">
            <Mail className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className={input}
              autoComplete="email"
              required
            />
          </div>
        </label>

        <label className={`mt-4 block text-sm font-medium ${label}`}>
          Certificate number
          <div className="relative mt-2">
            <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter certificate number"
              className={`${input} font-mono`}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] py-3 text-sm font-bold text-black shadow-md transition hover:brightness-110 disabled:opacity-50"
        >
          {status === "loading" ? "Verifying…" : "Verify certificate"}
        </button>
        <p className={`mt-3 text-xs leading-relaxed ${muted}`}>
          Use the email from registration and the certificate number printed on the credential.
        </p>
      </form>

      <div className={`${card} p-8 text-center`}>
        {status === "loading" ? (
          <p className={muted}>Checking email and certificate in our database…</p>
        ) : status === "ok" && certificate ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <ShieldCheck className="h-9 w-9 text-emerald-600" aria-hidden />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-emerald-700">Certificate verified</h2>
            <p className={`mt-1 text-sm ${muted}`}>
              Authentic {COMPANY_DISPLAY_NAME} credential
            </p>

            {certificate.certificateNumber ? (
              <p className="mt-4 font-mono text-base font-semibold text-[#8a6412]">
                {certificate.certificateNumber}
              </p>
            ) : null}

            <dl className={detailBox}>
              <div className="flex justify-between gap-4">
                <dt className={muted}>Learner</dt>
                <dd className={`font-semibold ${strong}`}>{certificate.learnerName}</dd>
              </div>
              {certificate.companyName ? (
                <div className="flex justify-between gap-4">
                  <dt className={muted}>Organisation</dt>
                  <dd className={`text-right ${body}`}>{certificate.companyName}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className={muted}>Course</dt>
                <dd className={`max-w-[60%] text-right ${body}`}>{certificate.courseTitle}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={muted}>Issued</dt>
                <dd className={body}>
                  {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
              {certificate.scorePercent != null ? (
                <div className="flex justify-between gap-4">
                  <dt className={muted}>Score</dt>
                  <dd className={`font-semibold ${strong}`}>{certificate.scorePercent}%</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className={muted}>Holder type</dt>
                <dd className={`capitalize ${body}`}>{certificate.holderType}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {certificate.pdfReady || certificate.pdfUrl ? (
                <a
                  href={certificateDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Download PDF
                </a>
              ) : null}
              {verifyPageUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      isLight
                        ? "border-[#b4965a]/40 text-slate-700 hover:bg-[#f8f4ec]"
                        : "border-white/15 text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {copied ? "Copied!" : "Copy verify link"}
                  </button>
                  <a
                    href={buildLinkedInShareUrl(verifyPageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004182]"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden />
                    Share on LinkedIn
                  </a>
                </>
              ) : null}
            </div>
          </>
        ) : status === "fail" ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15">
              <ShieldX className="h-9 w-9 text-rose-500" aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold text-rose-600">Not verified</h2>
            <p className={`mt-2 text-sm ${isLight ? "text-slate-600" : "text-gray-400"}`}>
              {message || "Email and certificate number do not match any issued certificate."}
            </p>
            <p className={`mt-4 text-xs ${muted}`}>
              Use the same email registered for the course, and the exact certificate number. Need
              help?{" "}
              <Link href="/contact" className="font-semibold text-[#8a6412] underline">
                Contact us
              </Link>
              .
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <BadgeCheck className="mx-auto h-10 w-10 text-[#b4965a]" aria-hidden />
            <p className={`text-sm ${isLight ? "text-slate-600" : "text-gray-400"}`}>
              Use the email and certificate number from the issued credential to begin verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyCertificatePage() {
  const [isLight, setIsLight] = useState(true);

  useEffect(() => {
    const sync = () => setIsLight(document.documentElement.dataset.theme !== "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={
        isLight
          ? "min-h-[70vh] bg-[#f8f4ec] px-4 py-14 text-slate-900"
          : "min-h-[70vh] bg-[#0a0a0a] px-4 py-14 text-white"
      }
    >
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6412]">
          Accredited credential check
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Verify a certificate
        </h1>
        <p className={`mt-3 text-sm leading-relaxed md:text-[15px] ${isLight ? "text-slate-600" : "text-gray-400"}`}>
          Confirm that a {COMPANY_DISPLAY_NAME} certificate is authentic and issued through our
          accredited training programmes — trusted by employers, institutions, and learners worldwide.
        </p>
        <div
          className={`mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${
            isLight ? "text-[#8a6412]" : "text-amber-200/90"
          }`}
        >
          <span className={`rounded-full border px-3 py-1 ${isLight ? "border-[#b4965a]/40 bg-white/70" : "border-amber-500/30 bg-white/5"}`}>
            Official records
          </span>
          <span className={`rounded-full border px-3 py-1 ${isLight ? "border-[#b4965a]/40 bg-white/70" : "border-amber-500/30 bg-white/5"}`}>
            Employer trusted
          </span>
          <span className={`rounded-full border px-3 py-1 ${isLight ? "border-[#b4965a]/40 bg-white/70" : "border-amber-500/30 bg-white/5"}`}>
            Secure verification
          </span>
        </div>
      </div>
      <Suspense
        fallback={
          <p className={`text-center ${isLight ? "text-slate-500" : "text-gray-400"}`}>Loading…</p>
        }
      >
        <VerifyContent isLight={isLight} />
      </Suspense>
    </div>
  );
}
