"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Building2, Check, Users, Video } from "lucide-react";
import { CoursePrice } from "@/components/CoursePrice";
import type { HomePageOrgPlan } from "@/lib/content-schema";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { resolveOrganizationCoursePriceBySeatCount } from "@/lib/organization-course-pricing";
import {
  getActiveOrgPremiumPlan,
  getOrgPremiumPlansCatalog,
  ORG_PREMIUM_PLAN_EVENT,
  setActiveOrgPremiumPlan,
  updateOrgPremiumSeatLimit,
} from "@/lib/organization-premium-plans";
import type { OrgPremiumPlanId } from "@/lib/organization-team-config";
import { ORG_TEAM_DATA_EVENT } from "@/lib/organization-team-sync-client";

export type OrganizationSubscriptionPlan = {
  id: OrgPremiumPlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  priceNote?: string;
  billingSuffix?: string;
  features: string[];
  cta: string;
  seatDefault: number;
  seatMin: number;
  seatMax: number;
  highlighted?: boolean;
  primaryCta?: boolean;
};

function buildOrganizationSubscriptionPlans(orgPlan: HomePageOrgPlan): OrganizationSubscriptionPlan[] {
  const catalog = getOrgPremiumPlansCatalog();
  return catalog.map((plan) => {
    const isEarly = plan.id === "early-program";
    const isMonthly = plan.id === "monthly-premium";
    return {
      id: plan.id,
      name: plan.name,
      tagline: plan.tagline,
      priceLabel: isMonthly
        ? plan.priceLabel || "Per seat"
        : isEarly
          ? orgPlan.price || plan.priceLabel || "Annual early access"
          : plan.priceLabel || "Annual premium",
      billingSuffix: plan.billingSuffix,
      priceNote:
        plan.priceNote ||
        `${plan.defaultSeatLimit} employees · any course · multiple courses per person`,
      features:
        isEarly && orgPlan.features.length > 0
          ? [...plan.features.slice(0, 1), ...orgPlan.features.slice(0, 3), ...plan.features.slice(-2)]
          : plan.features,
      cta: isEarly ? orgPlan.cta || `Select ${plan.name}` : `Select ${plan.name}`,
      seatDefault: plan.defaultSeatLimit,
      seatMin: plan.minSeatLimit,
      seatMax: plan.maxSeatLimit,
      highlighted: plan.highlighted,
      primaryCta: plan.highlighted,
    };
  });
}

type Props = {
  orgPlan: HomePageOrgPlan;
  plans?: OrganizationSubscriptionPlan[];
};

export function MyLearningOrganizationSubscriptions({
  orgPlan,
  plans: plansProp,
}: Props) {
  const plans = plansProp ?? buildOrganizationSubscriptionPlans(orgPlan);
  const { region, showPrices } = useLearnerPricing();
  const [activePlan, setActivePlan] = useState(() => getActiveOrgPremiumPlan());
  const [seatDraft, setSeatDraft] = useState<number | "">("");

  const refresh = useCallback(() => {
    const plan = getActiveOrgPremiumPlan();
    setActivePlan(plan);
    setSeatDraft(plan.seatLimit);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(ORG_PREMIUM_PLAN_EVENT, onUpdate);
    window.addEventListener(ORG_TEAM_DATA_EVENT, onUpdate);
    return () => {
      window.removeEventListener(ORG_PREMIUM_PLAN_EVENT, onUpdate);
      window.removeEventListener(ORG_TEAM_DATA_EVENT, onUpdate);
    };
  }, [refresh]);

  const monthlySeatEstimate = useMemo(() => {
    if (!showPrices || typeof seatDraft !== "number") return null;
    const pseudoCourse = {
      price: orgPlan.price,
      oldPrice: "",
      regionalPrices: [] as const,
      organizationSeatPricing: [] as const,
    };
    const resolved = resolveOrganizationCoursePriceBySeatCount(pseudoCourse, region, seatDraft);
    return resolved.ready ? resolved.price : null;
  }, [orgPlan.price, region, seatDraft, showPrices]);

  const selectPlan = (planId: OrgPremiumPlanId, seatDefault: number) => {
    setActiveOrgPremiumPlan(planId, seatDefault);
    refresh();
  };

  const applySeatCount = () => {
    if (typeof seatDraft !== "number") return;
    updateOrgPremiumSeatLimit(seatDraft);
    refresh();
  };

  return (
    <div className="my-learning-subscriptions mx-auto w-full max-w-6xl">
      <div className="text-center">
        <h1 className="my-learning-subscriptions-title text-2xl font-bold text-white md:text-3xl">Team Plans</h1>
        <p className="mx-auto mt-1.5 max-w-2xl text-sm text-gray-400">
          Three premium tiers — <strong className="font-medium text-gray-300">Monthly Premium</strong>{" "}
          (20 employees), <strong className="font-medium text-gray-300">Early Program</strong> (50+), and{" "}
          <strong className="font-medium text-gray-300">Premium Package</strong> (124). Each employee
          may take multiple courses; seat limits control how many people can learn.
        </p>
      </div>

      <article className="my-learning-subscription-banner mx-auto mt-4 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
        Active plan: <strong>{activePlan.name}</strong> ·{" "}
        <strong>{activePlan.seatLimit} learner seats</strong> · any course in catalog
      </article>

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-gray-400">
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <Building2 size={13} className="text-amber-300" />
          Organisation billing
        </span>
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <BookOpen size={13} className="text-amber-300" />
          Any course per plan
        </span>
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <Video size={13} className="text-[#FFC107]" />
          Tutor-led programs
        </span>
        <span className="my-learning-subscription-pill inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <Award size={13} className="text-emerald-300" />
          Team certificates
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isActive = activePlan.id === plan.id;
          return (
            <article
              key={plan.id}
              className={`my-learning-subscription-card relative flex flex-col rounded-xl border bg-linear-to-b from-[#12121a] to-[#0a0a0a] p-5 ${
                plan.highlighted
                  ? "my-learning-subscription-card--highlighted border-amber-400/50 shadow-[0_0_24px_rgba(255,193,7,0.12)]"
                  : isActive
                    ? "my-learning-subscription-card--active border-emerald-500/40"
                    : "border-white/10"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                  Most popular
                </span>
              ) : isActive ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                  Current plan
                </span>
              ) : null}

              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <p className="mt-0.5 text-sm text-gray-400">{plan.tagline}</p>

              <div className="mt-3">
                <CoursePrice
                  label={plan.priceLabel}
                  exactLabel
                  className="my-learning-subscription-price text-2xl font-bold text-white"
                />
                {plan.billingSuffix ? (
                  <span className="ml-1 text-sm text-gray-500">{plan.billingSuffix}</span>
                ) : null}
                {plan.priceNote ? (
                  <p className="mt-1 text-[11px] text-gray-500">{plan.priceNote}</p>
                ) : null}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => selectPlan(plan.id, plan.seatDefault)}
                className={`my-learning-subscription-plan-cta mt-4 inline-flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-bold transition ${
                  plan.primaryCta
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "my-learning-subscription-secondary-cta border border-white/20 bg-white/5 font-semibold text-white hover:border-amber-400/40 hover:bg-white/10"
                }`}
              >
                {isActive ? "Selected" : plan.cta}
              </button>
            </article>
          );
        })}
      </div>

      <article className="my-learning-subscription-seats mt-5 rounded-xl border border-white/10 bg-black/30 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Users size={16} className="text-amber-300" aria-hidden />
              Adjust learner seats for {activePlan.name}
            </p>
            <p className="mt-1 max-w-lg text-xs text-gray-500">
              Monthly Premium defaults to 20 employees; Early Program to 50+; Premium Package to 124.
              Change the count here — invite and assign screens will use the same limit.
            </p>
          </div>
          {monthlySeatEstimate && activePlan.id === "monthly-premium" ? (
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-200">{monthlySeatEstimate}</p>
              <p className="text-[11px] text-gray-500">Estimate for {seatDraft} seats</p>
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="org-plan-seats" className="mb-1 block text-xs font-medium text-gray-400">
              Number of employees who can learn
            </label>
            <input
              id="org-plan-seats"
              type="number"
              min={activePlan.minSeatLimit}
              max={activePlan.maxSeatLimit}
              placeholder={`e.g. ${activePlan.defaultSeatLimit}`}
              value={seatDraft === "" ? "" : seatDraft}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  setSeatDraft("");
                  return;
                }
                const n = Number.parseInt(raw, 10);
                setSeatDraft(Number.isFinite(n) && n > 0 ? n : "");
              }}
              className="w-full min-w-[10rem] max-w-xs rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
            />
            <p className="mt-1 text-[10px] text-zinc-600">
              Allowed: {activePlan.minSeatLimit}–{activePlan.maxSeatLimit}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void applySeatCount()}
            disabled={typeof seatDraft !== "number"}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            Apply seat count
          </button>
          <Link
            href="/my-learning?tab=invite-employees"
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:border-amber-400/40"
          >
            Invite employees →
          </Link>
        </div>
      </article>

      <p className="mt-3 pb-0 text-center text-xs text-gray-500">
        Seat limits apply to how many employees can be invited and assigned courses — not how many
        courses each person takes. Pricing finalises at checkout when billing is connected.
      </p>
    </div>
  );
}
