"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  UserSearch,
} from "lucide-react";
import { readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { COMPANY_DISPLAY_NAME, SFT_EMAILS, SFT_OFFICES } from "@/lib/contact-site-data";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import type { HomePageFaq } from "@/lib/content-schema";
import { defaultHomePageConfig } from "@/lib/content-schema";

const CONTACT_CHANNELS = [
  {
    title: "Email Support",
    detail: SFT_EMAILS.info,
    href: `mailto:${SFT_EMAILS.info}`,
    icon: Mail,
    accent: "text-amber-300",
  },
  {
    title: "Business Development",
    detail: SFT_EMAILS.bdm,
    href: `mailto:${SFT_EMAILS.bdm}`,
    icon: Mail,
    accent: "text-amber-300",
  },
  {
    title: "Phone Support (India)",
    detail: "+91 9056742783",
    href: "tel:+919056742783",
    icon: Phone,
    accent: "text-amber-300",
  },
  {
    title: "Phone Support (Canada)",
    detail: "+1 (778) 798-9624",
    href: "tel:+17787989624",
    icon: Phone,
    accent: "text-amber-300",
  },
  {
    title: "Live Chat",
    detail: "Chat with our support team",
    action: "chat" as const,
    icon: MessageCircle,
    accent: "text-amber-300",
  },
  {
    title: "WhatsApp",
    detail: "+91 9056742783",
    href: "https://wa.me/919056742783",
    icon: MessageCircle,
    accent: "text-emerald-400",
  },
  {
    title: "Working Hours",
    detail: "Mon – Sat: 9:00 AM – 8:00 PM (IST)",
    icon: Clock,
    accent: "text-sky-300",
  },
];

const CONTACT_FAQ_FALLBACK: HomePageFaq[] = defaultHomePageConfig.faqs;

function openLiveChat() {
  window.dispatchEvent(new CustomEvent("lms-open-chat"));
}

export default function ContactPageContent() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<HomePageFaq[]>(CONTACT_FAQ_FALLBACK);
  const [faqHeading, setFaqHeading] = useState("Frequently Asked Questions");
  const [faqSubtitle, setFaqSubtitle] = useState("Find quick answers to common questions.");

  const loadCaptcha = async () => {
    try {
      const res = await fetch("/api/contact/captcha");
      const data = (await res.json()) as { question?: string; token?: string };
      if (data.question && data.token) {
        setCaptchaQuestion(data.question);
        setCaptchaToken(data.token);
        setCaptchaAnswer("");
      }
    } catch {
      setCaptchaQuestion("");
      setCaptchaToken("");
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site/home-page", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          faqs?: HomePageFaq[];
          homeFaqs?: HomePageFaq[];
          faqPage?: { title?: string; subtitle?: string };
        };
        const rows = (data.homeFaqs ?? data.faqs ?? []).filter((f) => f.q.trim() && f.a.trim());
        if (rows.length > 0) setFaqs(rows.slice(0, 5));
        if (data.faqPage?.title?.trim()) setFaqHeading(data.faqPage.title);
        if (data.faqPage?.subtitle?.trim()) setFaqSubtitle(data.faqPage.subtitle);
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLearnerLoggedIn()) return;
    const profile = readLearnerProfileFromStorage();
    const learnerEmail = getLearnerEmail();
    if (profile.name && !fullName) setFullName(profile.name);
    if (learnerEmail && !email) setEmail(learnerEmail);
    if (profile.phone && !mobile) setMobile(profile.phone);
  }, [email, fullName, mobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          mobile,
          message,
          captchaAnswer,
          captchaToken,
          pagePath: "/contact",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (data.ok) {
        setFeedback({ type: "ok", text: data.message ?? "Message sent successfully." });
        setMessage("");
        void loadCaptcha();
      } else {
        setFeedback({ type: "err", text: data.message ?? "Could not send message." });
        void loadCaptcha();
      }
    } catch {
      setFeedback({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30";

  return (
    <div className="min-h-screen bg-[#06080f] text-white">
      <main className="mx-auto w-full max-w-[1760px] px-4 py-2 md:px-6 md:py-3 xl:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070d]">
          <div className="grid items-center gap-4 p-4 md:gap-5 md:p-5 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:p-5">
            <article className="order-2 flex min-w-0 flex-col gap-3 lg:order-1 lg:gap-3.5">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2.35rem] lg:leading-[1.1]">
                  We&apos;re Here to <span className="text-amber-300">Help You</span>
                </h1>
                <p className="max-w-lg text-sm leading-6 text-gray-400">
                  Have a question, need support, or want to learn more about {COMPANY_DISPLAY_NAME}? Our team is ready
                  to assist you.
                </p>
              </div>

              <ul className="grid gap-3 sm:grid-cols-3 sm:gap-2.5">
                {[
                  { icon: Clock, title: "Quick Support", desc: "We usually respond within a few hours." },
                  { icon: UserSearch, title: "Expert Guidance", desc: "Get help from our learning experts." },
                  { icon: MessageCircle, title: "Multiple Channels", desc: "Reach us via email, phone, or live chat." },
                ].map((item) => (
                  <li key={item.title} className="flex min-w-0 items-start gap-2.5 sm:flex-col sm:gap-2">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/15">
                      <item.icon size={17} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-white">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="order-1 relative flex min-h-0 items-center justify-center lg:order-2">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.12),transparent_68%)]"
                aria-hidden
              />
              <div className="relative h-[200px] w-full sm:h-[240px] md:h-[280px] lg:h-[340px]">
                <Image
                  src="/contact-us-1.png"
                  alt="Contact support — laptop, headset, and feedback envelope"
                  fill
                  className="object-contain object-center"
                  priority
                  sizes="(max-width: 1024px) 100vw, 620px"
                />
              </div>
            </article>
          </div>
        </section>

        {/* Form + channels */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-white/10 bg-[#0a0f1a]/80 p-6 md:p-8">
            <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Contact form
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-snug">
              Send Us Your Inquiry
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Complete the form below (name, email, mobile, and message). This is separate from the home page
              newsletter email sign-up.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-label="Contact inquiry form">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-xs font-semibold text-gray-300">
                  Full name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-mobile" className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Mobile number
                  </label>
                  <input
                    id="contact-mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter your mobile number"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-xs font-semibold text-gray-300">
                  Your message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help your business or career..."
                  className={`${inputClass} resize-y min-h-[120px]`}
                />
              </div>
              <div>
                <label htmlFor="contact-captcha" className="mb-1.5 block text-xs font-semibold text-gray-300">
                  Security check (captcha)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="inline-flex min-w-[88px] items-center justify-center rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-semibold text-amber-200">
                    {captchaQuestion || "…"}
                  </span>
                  <input
                    id="contact-captcha"
                    type="text"
                    inputMode="numeric"
                    required
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Enter captcha"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => void loadCaptcha()}
                    className="text-xs font-semibold text-amber-300 transition hover:text-amber-200 sm:px-2"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {feedback ? (
                <p
                  className={`text-sm ${feedback.type === "ok" ? "text-emerald-300" : "text-red-300"}`}
                  role="status"
                >
                  {feedback.text}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Message"}
                  <Send size={16} />
                </button>
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock size={13} className="text-amber-300/80" />
                  Your information is safe with us
                </p>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0a0f1a]/80 p-6 md:p-8">
            <h2 className="text-2xl font-bold">Other Ways to Reach Us</h2>
            <p className="mt-1 text-sm text-gray-400">Choose the channel that works best for you.</p>
            <ul className="mt-6 space-y-3">
              {CONTACT_CHANNELS.map((channel) => {
                const Icon = channel.icon;
                const inner = (
                  <>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ${channel.accent}`}
                      >
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{channel.title}</p>
                        <p className="text-xs text-gray-400">{channel.detail}</p>
                      </div>
                    </div>
                    {"href" in channel || "action" in channel ? (
                      <ChevronRight size={18} className="shrink-0 text-gray-500" />
                    ) : null}
                  </>
                );

                if ("action" in channel && channel.action === "chat") {
                  return (
                    <li key={channel.title}>
                      <button
                        type="button"
                        onClick={openLiveChat}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left transition hover:border-amber-400/30 hover:bg-white/5"
                      >
                        {inner}
                      </button>
                    </li>
                  );
                }

                if ("href" in channel && channel.href) {
                  return (
                    <li key={channel.title}>
                      <a
                        href={channel.href}
                        target={channel.href.startsWith("http") ? "_blank" : undefined}
                        rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/30 hover:bg-white/5"
                      >
                        {inner}
                      </a>
                    </li>
                  );
                }

                return (
                  <li
                    key={channel.title}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    {inner}
                  </li>
                );
              })}
            </ul>
          </article>
        </section>

        {/* Offices + FAQ */}
        <section className="mt-4 grid gap-6 lg:grid-cols-[1.62fr_1fr] lg:items-start">
          <article className="min-w-0">
            <h2 className="text-2xl font-bold md:text-[1.65rem]">Our Offices</h2>
            <p className="mt-1.5 text-sm text-gray-400">
              Visit us at any of our 5 office locations or connect with our team remotely.
            </p>

            <div className="mt-5 grid grid-cols-6 gap-3 sm:gap-3.5">
              {SFT_OFFICES.map((office, idx) => (
                <article
                  key={office.title}
                  className={`col-span-6 flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0e16] sm:col-span-3 lg:col-span-2 ${
                    idx === 3 ? "lg:col-start-2" : ""
                  }`}
                >
                  <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden">
                    <Image
                      src={office.image}
                      alt={office.title}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 640px) 100vw, 360px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="inline-flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-white">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-amber-400" aria-hidden />
                      <span>{office.country}</span>
                    </p>
                    <p className="mt-2 flex-1 text-[11px] leading-4 text-gray-500">{office.address}</p>
                    <a
                      href={office.phoneHref}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400 transition hover:text-amber-200"
                    >
                      <Phone size={11} className="text-amber-400" />
                      Call us {office.phone}
                    </a>
                    <a
                      href={office.mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 transition hover:text-amber-200"
                    >
                      View on Map <ArrowRight size={12} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="min-w-0 lg:pt-0">
            <h2 className="text-2xl font-bold md:text-[1.65rem]">{faqHeading}</h2>
            <p className="mt-1.5 text-sm text-gray-400">{faqSubtitle}</p>

            <div className="mt-5 space-y-2.5">
              {faqs.slice(0, 5).map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0e16]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[13px] font-medium leading-snug text-gray-100">{faq.q}</span>
                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180 text-amber-300" : ""}`}
                      />
                    </button>
                    {isOpen ? (
                      <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-gray-400">
                        {faq.a}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Link
              href="/faq"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
            >
              View all FAQs <ArrowRight size={14} />
            </Link>
          </article>
        </section>

        {/* Bottom CTA */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r from-[#140f08] via-[#0c1018] to-[#0a0d14]">
          <div className="grid items-center gap-6 p-5 md:grid-cols-[minmax(0,220px)_1fr_auto] md:gap-8 md:p-7 lg:p-8">
            <div className="relative mx-auto h-[150px] w-full max-w-[220px] shrink-0 md:mx-0 md:h-[170px]">
              <Image
                src="/contact-us-2.png"
                alt="Support team member ready to chat"
                fill
                className="object-contain object-bottom"
                sizes="220px"
              />
            </div>

            <div className="min-w-0 text-center md:text-left">
              <h3 className="text-2xl font-bold leading-tight text-white md:text-[1.75rem]">Still need help?</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                Our support team is available to help you with any questions or concerns.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2.5 md:items-end">
              <button
                type="button"
                onClick={openLiveChat}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
              >
                <MessageCircle size={18} strokeWidth={2} />
                Start Live Chat
              </button>
              <p className="text-xs text-gray-500">Average response time: 5 mins</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
