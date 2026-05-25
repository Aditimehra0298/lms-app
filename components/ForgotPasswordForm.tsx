"use client";

import { useEffect, useState } from "react";
import PasswordField from "@/components/PasswordField";
import PasswordPolicyHint from "@/components/PasswordPolicyHint";
import { validateLearnerPassword } from "@/lib/password-policy";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none";

const RESEND_SECONDS = 60;

type Props = {
  accountType: "individual" | "organisation";
  onBackToLogin: () => void;
  onSuccess: () => void;
};

export default function ForgotPasswordForm({ accountType, onBackToLogin, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const emailPlaceholder = accountType === "organisation" ? "Work email" : "Email";

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const sendCode = async () => {
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
        devCode?: string;
      };
      if (!data.ok) {
        setError(data.message ?? "Could not send reset code.");
        return;
      }
      setMessage(
        data.devCode
          ? `Dev code: ${data.devCode}`
          : (data.message ?? "Check your email for the reset code."),
      );
      setStep("reset");
      setResendIn(RESEND_SECONDS);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Email is required.");
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    const policy = validateLearnerPassword(password);
    if (!policy.ok) {
      setError(policy.message);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          code: otpCode.trim(),
          password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not reset password.");
        return;
      }
      setMessage(data.message ?? "Password updated.");
      onSuccess();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
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

      {step === "email" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Enter your login email. We will send a 6-digit code to reset your password.
          </p>
          <input
            type="email"
            placeholder={emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {message && <p className="text-sm text-amber-100/90">{message}</p>}
          <button
            type="button"
            onClick={sendCode}
            disabled={sending}
            className="w-full rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3.5 font-bold text-black disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send reset code"}
          </button>
        </div>
      )}

      {step === "reset" && (
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="email"
            name="forgot_email_display"
            value={email}
            readOnly
            className={`md:col-span-2 ${inputClass} opacity-70`}
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code from email"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={inputClass}
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={sending || resendIn > 0}
            className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100 disabled:opacity-50"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </button>
          <div className="md:col-span-2">
            <PasswordPolicyHint password={password} live />
          </div>
          <PasswordField
            placeholder="New password"
            name="reset_password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            placeholder="Retype new password"
            name="reset_password_confirm"
            autoComplete="new-password"
            minLength={8}
            value={passwordConfirm}
            onChange={setPasswordConfirm}
          />
          {error && <p className="md:col-span-2 text-sm text-rose-300">{error}</p>}
          {message && <p className="md:col-span-2 text-sm text-emerald-300">{message}</p>}
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={submitting}
            className="md:col-span-2 w-full rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3.5 font-bold text-black disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Set new password"}
          </button>
        </div>
      )}
    </div>
  );
}
