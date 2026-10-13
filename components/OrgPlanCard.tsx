"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import {
  orgTierRenewal,
  orgTierTotal,
  type HomePageOrgPlan,
} from "@/lib/content-schema";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type Props = {
  plan: HomePageOrgPlan;
  goldGradient: string;
  busy: boolean;
  disabled: boolean;
  onBuy: (planKey: string, seats?: number) => void;
};

export function OrgPlanCard({ plan, goldGradient, busy, disabled, onBuy }: Props) {
  const tiers = (plan.tiers ?? []).filter((t) => t.maxSeats > 0 && t.pricePerSeat > 0);
  const [tierIdx, setTierIdx] = useState(0);
  const tier = tiers[Math.min(tierIdx, Math.max(0, tiers.length - 1))];
  const renewalPercent = plan.renewalPercent ?? 50;
  const seatsLabel = tier ? String(tier.maxSeats) : String(plan.seats ?? "");

  const features = (plan.features ?? [])
    .filter(Boolean)
    .map((f) => f.replace(/\{seats\}/g, seatsLabel).replace(/\{renewalPercent\}/g, String(renewalPercent)));

  const checkoutKey = plan.checkoutKey?.trim();
  const buttonClass = `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-60 ${goldGradient}`;

  return (
    <article className="lh-plan-card flex h-full flex-col rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_30px_rgba(249,177,77,0.2)] transition-all hover:-translate-y-0.5 hover:border-amber-300/75 hover:shadow-[0_0_42px_rgba(249,177,77,0.3)]">
      <p className="text-sm font-semibold text-amber-300">{plan.title}</p>
      <p className="mt-1 text-sm text-gray-300">{plan.tagline}</p>
      <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.desc}</p>

      {tiers.length > 0 && tier ? (
        <>
          <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-amber-100">
            <Users className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            How many employees?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiers.map((t, i) => (
              <button
                key={t.maxSeats}
                type="button"
                onClick={() => setTierIdx(i)}
                aria-pressed={i === tierIdx}
                className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                  i === tierIdx
                    ? "border-amber-400 bg-amber-500/20 text-amber-100"
                    : "border-white/15 bg-black/30 text-gray-300 hover:border-amber-400/50"
                }`}
              >
                {t.minSeats}–{t.maxSeats}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-black/30 p-4">
            <p className="text-sm text-gray-300">
              <span className="text-lg font-bold text-amber-200">{inr(tier.pricePerSeat)}</span> per employee ×{" "}
              {tier.maxSeats}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {inr(orgTierTotal(tier))} <span className="text-base font-semibold text-gray-400">/ year</span>
            </p>
            <p className="mt-1 text-xs text-amber-100/90">
              For organisations with {tier.minSeats} to {tier.maxSeats} employees
            </p>
            <p className="mt-2 text-xs text-emerald-300">
              Annual renewal: {inr(orgTierRenewal(tier, renewalPercent))} ({renewalPercent}% of the fee paid)
            </p>
          </div>
        </>
      ) : plan.price?.trim() ? (
        <p className="mt-5 text-3xl font-extrabold text-white">{plan.price}</p>
      ) : null}

      {plan.note ? <p className="mt-2 text-xs text-amber-100/90">{plan.note}</p> : null}
      <ul className="mt-5 space-y-2 text-sm text-gray-200">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        {checkoutKey ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBuy(checkoutKey, tier?.maxSeats)}
            className={buttonClass}
          >
            {busy ? "Opening payment…" : plan.cta} <ChevronRight size={16} />
          </button>
        ) : (
          <Link href={plan.href?.trim() || "/contact"} className={buttonClass}>
            {plan.cta} <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}
