import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CreditCard,
  GraduationCap,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { defaultOrgPlans, normalizeIndividualPlans } from "@/lib/content-schema";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subscriptions",
  description:
    "Annual subscriptions for individuals and organisations — unlock one category or every self-paced course with certificates.",
};

const STEPS = [
  { Icon: MousePointerClick, title: "Choose a plan", text: "Pick one category, all courses, or a team plan with the seats you need." },
  { Icon: CreditCard, title: "Pay securely", text: "Checkout online with UPI, cards or net banking through Razorpay." },
  { Icon: BookOpen, title: "Start learning", text: "Courses unlock instantly in My Learning — no waiting, no approval." },
  { Icon: Award, title: "Get certified", text: "Finish a course and download your certificate straight away." },
];

const BENEFITS = [
  { Icon: CalendarClock, title: "12 months access", text: "Learn at your own pace for a full year." },
  { Icon: Sparkles, title: "New courses included", text: "Courses added during your plan unlock automatically." },
  { Icon: ShieldCheck, title: "Secure payments", text: "Payments are processed by Razorpay." },
  { Icon: RefreshCw, title: "Easy renewal", text: "Renew before expiry and your access simply extends." },
];

const FAQS = [
  {
    q: "What happens when my subscription ends?",
    a: "Courses unlocked by the subscription are locked again after 12 months. Renew any time before that and your access extends from the current end date.",
  },
  {
    q: "Do new courses come with my plan?",
    a: "Yes. Any new self-paced course published in your category (or anywhere, for the All Courses plan) is added to your account automatically.",
  },
  {
    q: "Do I get certificates?",
    a: "Yes. Every course you complete during your subscription gives you a downloadable certificate.",
  },
  {
    q: "How do team plans work?",
    a: "Register as an Organisation, buy a seat tier, and add your employees from the organisation dashboard. Need more than 200 seats or a tailored programme? Ask for a Custom Plan.",
  },
];

export default async function SubscriptionsPage() {
  const [homeConfig, content, courses] = await Promise.all([
    resolveHomePageConfig(),
    readAdminContent(),
    getManagedCourses(),
  ]);

  const individualPlans = normalizeIndividualPlans(homeConfig.individualPlans);
  const orgPlans = (homeConfig.orgPlans?.length ? homeConfig.orgPlans : defaultOrgPlans).filter((plan) =>
    Boolean(plan?.title?.trim()),
  );
  const selfPacedCourses = courses.filter(
    (course) => course.published !== false && (course.learningFormat?.trim() || "self-paced") === "self-paced",
  );
  const categories = content.categories
    .filter((c) => c.isActive)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      courseCount: selfPacedCourses.filter((course) => course.category?.toLowerCase() === c.slug.toLowerCase()).length,
    }))
    .filter((c) => c.courseCount > 0);

  return (
    <div className="min-h-screen bg-[#06080f] text-white">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/10">
          <Image
            src="/lms-blogs-hero.png"
            alt="Learning subscriptions"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#06080f]/95 via-[#06080f]/75 to-[#06080f]/25" />
          <div className="relative z-10 max-w-2xl p-6 py-14 md:p-10 md:py-20">
            <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Subscriptions
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Learn more, <span className="text-amber-300">pay once a year</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300 md:text-base">
              One simple annual plan unlocks {selfPacedCourses.length}+ self-paced courses across{" "}
              {categories.length} categories — for you, or for your whole team.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-full bg-linear-to-b from-[#f9b14d] to-[#eb9422] px-5 py-2.5 text-sm font-bold text-black hover:brightness-110"
              >
                View plans <ArrowRight size={15} />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold hover:border-amber-300/50"
              >
                Browse courses
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <Icon className="h-5 w-5 text-amber-300" />
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">{text}</p>
            </div>
          ))}
        </section>

        <div className="mt-10">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Choose your <span className="text-amber-300">plan</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-400">
            Prices include 12 months of access. Pick who the plan is for.
          </p>
          <div className="mt-6">
            <Suspense fallback={<div className="h-96" aria-hidden />}>
              <SubscriptionPlans
                individualPlans={individualPlans}
                orgPlans={orgPlans}
                categories={categories}
                totalCourses={selfPacedCourses.length}
              />
            </Suspense>
          </div>
        </div>

        <section className="mt-12 grid items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 md:grid-cols-[1.2fr_1fr] md:p-8">
          <div>
            <h2 className="text-3xl font-bold">
              How it <span className="text-amber-300">works</span>
            </h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2">
              {STEPS.map(({ Icon, title, text }, index) => (
                <li key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-amber-300" />
                  </div>
                  <p className="mt-2 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-white/10">
            <Image
              src="/lms-podcast-certs.png"
              alt="Certificate earned on completion"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-8">
          <h2 className="text-3xl font-bold">
            Frequently asked <span className="text-amber-300">questions</span>
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {faq.q}
                    <span className="text-amber-300 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-gray-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative mt-6 overflow-hidden rounded-2xl border border-amber-300/25">
          <Image src="/lms-advisor-side.png" alt="Talk to a learning advisor" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-[#06080f]/95 via-[#06080f]/80 to-[#06080f]/30" />
          <div className="relative z-10 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-xl">
              <GraduationCap className="h-7 w-7 text-amber-300" />
              <p className="mt-2 text-2xl font-bold">Not sure which plan fits?</p>
              <p className="mt-1 text-sm text-gray-300">
                Tell us your goals or your team size and we will recommend the right subscription.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-linear-to-b from-[#f9b14d] to-[#eb9422] px-5 py-2.5 text-sm font-bold text-black hover:brightness-110"
            >
              Contact us <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
