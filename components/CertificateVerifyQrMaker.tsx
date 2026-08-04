"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { buildCertificateQrVerifyUrl } from "@/lib/certificate-verify-url";

type Props = {
  isLight: boolean;
  /** Prefill from the verify form certificate number field. */
  certificateNumber?: string;
};

export default function CertificateVerifyQrMaker({ isLight, certificateNumber = "" }: Props) {
  const [number, setNumber] = useState(certificateNumber);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (certificateNumber.trim()) setNumber(certificateNumber);
  }, [certificateNumber]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://sftlms.com";

  const qrTargetUrl = useMemo(
    () =>
      buildCertificateQrVerifyUrl(origin, {
        certificateNumber: number.trim() || null,
      }),
    [origin, number],
  );

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(qrTargetUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#1a1a2e", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qrTargetUrl]);

  const downloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    const safeName = (number.trim() || "verify-page").replace(/[^\w.-]+/g, "_");
    a.href = qrDataUrl;
    a.download = `certificate-verify-qr-${safeName}.png`;
    a.click();
  };

  const card = isLight
    ? "rounded-2xl border border-[#b4965a]/30 bg-white/90 p-6 shadow-sm"
    : "rounded-2xl border border-white/10 bg-[#141414] p-6";
  const label = isLight ? "text-slate-700" : "text-gray-300";
  const muted = isLight ? "text-slate-500" : "text-gray-500";
  const input = isLight
    ? "mt-2 w-full rounded-xl border border-[#b4965a]/35 bg-[#f8f4ec] px-3 py-3 font-mono text-sm text-slate-900 outline-none focus:border-[#9a7222]"
    : "mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 font-mono text-sm text-white outline-none focus:border-emerald-500/40";

  return (
    <div className={card}>
      <div className="flex items-center gap-2">
        <QrCode className={`h-5 w-5 ${isLight ? "text-[#8a6412]" : "text-amber-300"}`} aria-hidden />
        <h2 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
          Free QR for certificate (download PNG)
        </h2>
      </div>
      <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
        Generate a free QR image, download it, then paste it onto your certificate design (Canva,
        Photoshop, Word, etc.). Phone cameras will open the verify page.
      </p>

      <label className={`mt-4 block text-sm font-medium ${label}`}>
        Certificate number (optional)
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Leave blank for general verify page, or paste certificate number"
          className={input}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <p className={`mt-2 break-all text-[11px] ${muted}`}>
        QR opens: <span className={isLight ? "text-slate-700" : "text-gray-300"}>{qrTargetUrl}</span>
      </p>

      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div
          className={`flex h-44 w-44 items-center justify-center rounded-xl border p-2 ${
            isLight ? "border-[#b4965a]/30 bg-white" : "border-white/10 bg-white"
          }`}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Certificate verify QR code" className="h-full w-full" />
          ) : (
            <span className={`text-xs ${muted}`}>{busy ? "Creating…" : "No QR"}</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!qrDataUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-4 py-3 text-sm font-bold text-black shadow-md transition hover:brightness-110 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download QR PNG (free)
          </button>
          <p className={`text-xs leading-relaxed ${muted}`}>
            Tip: For each learner, put their certificate number above, download, and place the PNG
            on that certificate. For a template used by all, leave number blank so QR opens the
            general verify page.
          </p>
        </div>
      </div>
    </div>
  );
}
