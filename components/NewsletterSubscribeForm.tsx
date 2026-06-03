"use client";

import { useState } from "react";

type Props = {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  pagePath?: string;
  /** Visible label above the email field */
  emailLabel?: string;
  emailPlaceholder?: string;
  buttonText?: string;
};

export function NewsletterSubscribeForm({
  className = "flex w-full max-w-xl flex-col gap-2 sm:flex-row",
  inputClassName = "",
  buttonClassName = "",
  pagePath = "/",
  emailLabel = "Email address",
  emailPlaceholder = "Enter your email address",
  buttonText = "Subscribe",
}: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/forms/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pagePath }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (data.ok) {
        setFeedback({ type: "ok", text: data.message ?? "Thank you for subscribing." });
        setEmail("");
      } else {
        setFeedback({ type: "err", text: data.message ?? "Subscription failed." });
      }
    } catch {
      setFeedback({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <form className={className} onSubmit={handleSubmit} aria-label="Newsletter subscription">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
          <span className="text-xs font-semibold text-gray-300">{emailLabel}</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className={inputClassName}
          />
        </label>
        <button type="submit" disabled={submitting} className={`shrink-0 self-end sm:self-auto ${buttonClassName}`}>
          {submitting ? "Subscribing…" : buttonText}
        </button>
      </form>
      {feedback ? (
        <p
          role="status"
          className={`mt-2 text-xs ${feedback.type === "ok" ? "text-emerald-300" : "text-red-300"}`}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
