"use client";

import Link from "next/link";
import { Check, Award, BookOpen, Video } from "lucide-react";
import { CoursePrice } from "@/components/CoursePrice";

export type IndividualSubscriptionPlan = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceInr?: number;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  primaryCta?: boolean;
};

const INDIVIDUAL_SUBSCRIPTION_PLANS: IndividualSubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Self-paced courses & certificates",
    priceLabel: "₹999 / month",
    priceInr: 999,
    features: [
      "Selected self-paced courses (full programs — not per module)",
      "SF Trainings completion badges",
      "Digital certificates when you finish a course",
      "Community access",
      "Email support",
    ],
    cta: "Browse self-paced courses",
    ctaHref: "/courses",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Self-paced + tutor-led programs",
    priceLabel: "₹1,999 / month",
    priceInr: 1999,
    highlighted: true,
    primaryCta: true,
    features: [
      "Expanded self-paced course catalog",
      "Tutor-led live programs (Zoom training days)",
      "Course badges (Bronze, Silver, Gold tiers)",
      "Verified certificates on program completion",
      "Priority learner support",
      "Downloadable course resources",
    ],
    cta: "Start 7-day free trial",
    ctaHref: "/my-learning?tab=live",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Full catalog, badges & excellence certs",
    priceLabel: "₹3,499 / month",
    priceInr: 3499,
    features: [
      "Unlimited self-paced & tutor-led program access",
      "All SF Trainings badges and certificate tracks",
      "Certificate of excellence on eligible programs",
      "Live project sessions & mentor check-ins",
      "Career guidance",
      "Priority support",
    ],
    cta: "Start 7-day free trial",
    ctaHref: "/courses",
  },
];

type Props = {
  plans?: IndividualSubscriptionPlan[];
};

export function MyLearningIndividualSubscriptions({ plans = INDIVIDUAL_SUBSCRIPTION_PLANS }: Props) {
  return (
    <div className="my-learning-subscriptions mx-auto w-full max-w-6xl">
      <div className="text-center">
        <h1 className="my-learning-subscriptions-title text-2xl font-bold text-white md:text-3xl">
          Subscriptions
        </h1>
        <p className="mx-auto mt-1.5 max-w-2xl text-sm text-gray-400">
          Individual plans for <strong className="font-medium text-gray-300">self-paced courses</strong> and{" "}
          <strong className="font-medium text-gray-300">tutor-led programs</strong> — with badges and
          certificates when you complete a full course, not per module.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-gray-400">
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <BookOpen size={13} className="text-amber-300" />
          Self-paced courses
        </span>
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <Video size={13} className="text-[#FFC107]" />
          Tutor-led programs
        </span>
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <Award size={13} className="text-emerald-300" />
          Badges & certificates
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3 md:items-stretch">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`my-learning-subscription-card relative flex flex-col rounded-xl border bg-linear-to-b from-[#12121a] to-[#0a0a0a] p-5 ${
              plan.highlighted
                ? "my-learning-subscription-card--highlighted border-amber-400/50 shadow-[0_0_24px_rgba(255,193,7,0.12)]"
                : "border-white/10"
            }`}
          >
            {plan.highlighted ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                Most popular
              </span>
            ) : null}

            <h2 className="text-lg font-bold text-white">{plan.name}</h2>
            <p className="mt-0.5 text-sm text-gray-400">{plan.tagline}</p>

            <div className="mt-3">
              {plan.priceInr != null ? (
                <CoursePrice
                  inr={plan.priceInr}
                  className="my-learning-subscription-price text-2xl font-bold text-white"
                />
              ) : (
                <CoursePrice
                  label={plan.priceLabel}
                  exactLabel
                  className="my-learning-subscription-price text-2xl font-bold text-white"
                />
              )}
              <span className="ml-1 text-sm text-gray-500">/ month</span>
            </div>

            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.primaryCta ? (
              <Link
                href={plan.ctaHref}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-black transition hover:bg-amber-400"
              >
                {plan.cta}
              </Link>
            ) : (
              <Link
                href={plan.ctaHref}
                className="my-learning-subscription-secondary-cta mt-4 inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-white/10"
              >
                {plan.cta}
              </Link>
            )}
          </article>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        All plans include access on mobile, tablet and desktop. Billing is per course package — not per
        module.
      </p>
    </div>
  );
}
