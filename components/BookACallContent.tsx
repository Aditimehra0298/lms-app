"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Loader2, Mail, Phone } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { SFT_EMAILS, SFT_SOCIAL } from "@/lib/contact-site-data";

export default function BookACallContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("Course guidance");
  const [message, setMessage] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2 || !email.includes("@") || phone.trim().length < 8) {
      setError("Please share your full name, email, and a valid phone number.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/book-a-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim(),
          mobile: phone.trim(),
          message: [
            `Book a Call request`,
            `Topic: ${topic}`,
            preferredSlot ? `Preferred slot: ${preferredSlot}` : "",
            message.trim() || "Please call me back about LMS training.",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Could not submit request.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try WhatsApp or email.");
    } finally {
      setSending(false);
    }
  };

  const fieldClass =
    "w-full rounded-full border border-amber-500/25 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50";

  return (
    <LmsContentPageShell
      badge="Talk to us"
      title="Book a"
      titleHighlight="Call"
      subtitle="Tell us what you need — course guidance, corporate seats, or technical help — and our team will reach out."
      imageSrc="/lms-book-a-call-hero.png"
      imageAlt="Book a call with SFT advisors"
      ctaHref="/contact"
      ctaLabel="All contact options"
      secondaryCtaHref="/courses"
      secondaryCtaLabel="Browse courses"
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <LmsContentCard title="Request a callback">
          {done ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold">Request received</p>
                <p className="mt-1 text-sm text-emerald-100/80">
                  Thanks {name.trim().split(/\s+/)[0] || ""}. We’ll contact you on the details you shared.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={fieldClass} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone / WhatsApp"
                  className={fieldClass}
                />
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className={fieldClass}>
                  <option>Course guidance</option>
                  <option>Corporate / team seats</option>
                  <option>Payment or enrollment help</option>
                  <option>Certificates</option>
                  <option>Other</option>
                </select>
              </div>
              <input
                value={preferredSlot}
                onChange={(e) => setPreferredSlot(e.target.value)}
                placeholder="Preferred day / time (optional)"
                className={fieldClass}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What should we discuss?"
                className="w-full resize-y rounded-2xl border border-amber-500/25 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50"
              />
              {error ? <p className="text-xs text-rose-300">{error}</p> : null}
              <button
                type="submit"
                disabled={sending}
                className="lh-gold-btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-5 py-3 text-sm font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
                Submit request
              </button>
            </form>
          )}
        </LmsContentCard>

        <div className="space-y-4">
          <div className="lh-path-card overflow-hidden rounded-2xl border border-amber-500/35 bg-black/20 p-4 shadow-[0_0_24px_rgba(249,177,77,0.14)]">
            <Image
              src="/lms-advisor-side.png"
              alt="Talk with SFT training advisors"
              width={640}
              height={640}
              className="mx-auto h-auto w-full max-w-sm object-contain"
              sizes="420px"
            />
            <p className="mt-3 text-center text-sm font-bold text-[#fde68a]">Speak with our training advisors</p>
          </div>

          <LmsContentCard title="Faster options">
            <a
              href={SFT_SOCIAL.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200"
            >
              <Phone size={15} /> WhatsApp us
            </a>
            <p className="inline-flex items-center gap-2">
              <Mail size={15} className="text-amber-300" />
              <a href={`mailto:${SFT_EMAILS.info}`} className="font-bold text-[#fde68a] underline decoration-amber-500/40">
                {SFT_EMAILS.info}
              </a>
            </p>
            <p>
              Or visit{" "}
              <Link href="/contact" className="font-bold text-[#eb9422] underline decoration-amber-500/40">
                Contact
              </Link>{" "}
              for offices and live chat.
            </p>
          </LmsContentCard>

          <LmsContentCard title="Before the call">
            <p>
              Have your course interest, company name (if corporate), and any transaction ID ready if it’s a payment
              question.
            </p>
          </LmsContentCard>
        </div>
      </div>
    </LmsContentPageShell>
  );
}
