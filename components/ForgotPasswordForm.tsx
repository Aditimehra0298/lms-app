"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none";

const RESEND_SECONDS = 60;

type Props = {
  accountType: "individual" | "organisation";
  onBackToLogin: () => void;
  /** Reserved for parents that previously closed the form after a successful in-page reset. */
  onSuccess?: () => void;
};

export default function ForgotPasswordForm({ accountType, onBackToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const emailPlaceholder = accountType === "organisation" ? "Work email" : "Email";

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const sendLink = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!data.ok) {
        setError(data.message ?? "Could not send reset email.");
        return;
      }
      setMessage(
        data.message ??
          "If an account exists for this email, a password reset link has been sent. Check your inbox and spam.",
      );
      setSent(true);
      setResendIn(RESEND_SECONDS);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="md:col-span-2 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-amber-100">Forgot password</h3>
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-amber-200/90 hover:text-amber-100 hover:underline"
        >
          Back to login
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          Enter your login email. We will send a secure link to reset your password. The link expires in 24
          hours.
        </p>
        <input
          type="email"
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputClass}
          disabled={sending}
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {message && <p className="text-sm text-amber-100/90">{message}</p>}
        {sent ? (
          <p className="text-sm text-gray-400">
            Open the email and click <span className="text-amber-100">Reset Password</span>. You can request
            another link below if needed.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void sendLink()}
          disabled={sending || (sent && resendIn > 0)}
          className="w-full rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3.5 font-bold text-black disabled:opacity-60"
        >
          {sending
            ? "Sending…"
            : sent
              ? resendIn > 0
                ? `Resend in ${resendIn}s`
                : "Resend reset link"
              : "Send reset link"}
        </button>
      </div>
    </div>
  );
}
