"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

type Props = {
  open: boolean;
  isLight?: boolean;
  onClose: () => void;
  onScan: (raw: string) => void;
};

export default function CertificateQrScanner({ open, isLight = true, onClose, onScan }: Props) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => Promise<void>;
  } | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledRef.current = false;
    setError("");
    setStarting(true);

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decoded) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            const value = decoded.trim();
            if (!value) return;
            onScan(value);
            void (async () => {
              try {
                await scanner.stop();
                await scanner.clear();
              } catch {
                /* ignore */
              }
              scannerRef.current = null;
              onClose();
            })();
          },
          () => {
            /* ignore frame miss */
          },
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (cancelled) return;
        setStarting(false);
        const message =
          err instanceof Error && /NotAllowedError|Permission/i.test(err.message)
            ? "Camera permission denied. Allow camera access, or enter the certificate number manually."
            : "Could not start the camera. Use HTTPS (or localhost) and allow camera access, or enter the number manually.";
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .then(() => scanner.clear().catch(() => undefined));
      }
    };
  }, [open, onClose, onScan, regionId]);

  if (!open) return null;

  const panel = isLight
    ? "rounded-2xl border border-[#b4965a]/30 bg-white p-4 shadow-xl"
    : "rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-xl";
  const muted = isLight ? "text-slate-500" : "text-gray-400";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Scan certificate QR code"
      onClick={onClose}
    >
      <div className={`w-full max-w-md ${panel}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Camera className={`h-5 w-5 ${isLight ? "text-[#8a6412]" : "text-amber-300"}`} aria-hidden />
            <h2 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Scan certificate QR
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 ${isLight ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className={`mb-3 text-xs leading-relaxed ${muted}`}>
          Point your camera at the QR code printed on the certificate. The certificate number will
          fill in automatically.
        </p>

        <div
          id={regionId}
          className="overflow-hidden rounded-xl bg-black [&_video]:max-h-[320px] [&_video]:w-full [&_video]:object-cover"
        />

        {starting && !error ? (
          <p className={`mt-3 text-center text-sm ${muted}`}>Starting camera…</p>
        ) : null}
        {error ? <p className="mt-3 text-center text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
