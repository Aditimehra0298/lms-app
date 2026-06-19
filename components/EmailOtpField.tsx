"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  email: string;
  onEmailChange: (email: string) => void;
  emailInputName: string;
  emailPlaceholder?: string;
  verified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  onStatusMessage?: (message: string, type: "error" | "success" | "info") => void;
  className?: string;
};

const RESEND_SECONDS = 60;

export default function EmailOtpField({
  email,
  onEmailChange,
  emailInputName,
  emailPlaceholder = "Email",
  verified,
  onVerifiedChange,
  onStatusMessage,
  className = "",
}: Props) {
  const [otpCode, setOtpCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [localInfo, setLocalInfo] = useState("");

  useEffect(() => {
    onVerifiedChange(false);
    setOtpCode("");
    setLocalInfo("");
  }, [email, onVerifiedChange]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const notify = useCallback(
    (message: string, type: "error" | "success" | "info") => {
      setLocalInfo(message);
      onStatusMessage?.(message, type);
    },
    [onStatusMessage],
  );

  const handleSendOtp = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      notify("Enter a valid email before sending OTP.", "error");
      return;
    }
    setSending(true);
    setLocalInfo("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        devLogged?: boolean;
      };
      if (!data.ok) {
        notify(data.message ?? "Could not send OTP.", "error");
        return;
      }
      notify(
        data.message ?? "OTP sent.",
        data.devLogged ? "info" : "success",
      );
      setResendIn(RESEND_SECONDS);
    } catch {
      notify("Network error. Is the dev server running?", "error");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      notify("Enter your email first.", "error");
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      notify("Enter the 6-digit code from your email.", "error");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, code: otpCode.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!data.ok) {
        notify(data.message ?? "Invalid OTP.", "error");
        onVerifiedChange(false);
        return;
      }
      notify(data.message ?? "Email verified.", "success");
      onVerifiedChange(true);
    } catch {
      notify("Could not verify OTP.", "error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`md:col-span-2 space-y-3 ${className}`}>
      <div className="grid gap-3 md:grid-cols-2">
        {verified && <input type="hidden" name={emailInputName} value={email} />}
        <input
          name={verified ? undefined : emailInputName}
          type="email"
          placeholder={emailPlaceholder}
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          readOnly={verified}
          aria-readonly={verified}
          className={`rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none ${verified ? "cursor-default opacity-60" : ""}`}
        />
        <button
          type="button"
          onClick={handleSendOtp}
          disabled={sending || verified || resendIn > 0}
          className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verified ? "Email verified" : sending ? "Sending…" : resendIn > 0 ? `Resend in ${resendIn}s` : "Send OTP"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="email_otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="6-digit OTP"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={verified}
          className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={verifying || verified || otpCode.length < 6}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verified ? "Verified ✓" : verifying ? "Verifying…" : "Verify OTP"}
        </button>
      </div>

      {localInfo && (
        <p
          className={`text-sm ${verified ? "text-emerald-300" : localInfo.includes("verification code:") ? "font-mono text-lg text-amber-100" : localInfo.includes("terminal") ? "text-amber-200" : "text-gray-300"}`}
        >
          {localInfo}
        </p>
      )}
    </div>
  );
}
