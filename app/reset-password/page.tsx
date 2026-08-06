"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import PasswordField from "@/components/PasswordField";
import PasswordPolicyHint from "@/components/PasswordPolicyHint";
import { validateLearnerPassword } from "@/lib/password-policy";

const inputShell =
  "mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 shadow-xl backdrop-blur sm:p-8";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      setError("This reset link is missing a token. Request a new password reset email.");
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
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not reset password.");
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        router.push("/account");
      }, 1600);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={inputShell}>
      <h1 className="text-xl font-bold text-amber-100">Reset your password</h1>
      <p className="mt-2 text-sm text-gray-400">
        Choose a new password for your Sustainable Futures Trainings account.
      </p>

      {!token ? (
        <p className="mt-4 text-sm text-rose-300">
          Invalid reset link.{" "}
          <Link href="/account" className="underline hover:text-amber-100">
            Request a new one from the sign-in page
          </Link>
          .
        </p>
      ) : done ? (
        <p className="mt-4 text-sm text-emerald-300">
          Password updated. Redirecting you to sign in…
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          <PasswordPolicyHint password={password} live />
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
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3.5 font-bold text-black disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Set new password"}
          </button>
          <p className="text-center text-xs text-gray-500">
            <Link href="/account" className="hover:text-amber-100 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249,177,77,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.12), transparent 50%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <div className={inputShell}>
              <p className="text-sm text-gray-400">Loading reset form…</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
