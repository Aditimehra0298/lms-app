"use client";

import { useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import type { HomePagePlan } from "@/lib/content-schema";

type Props = {
  plan: HomePagePlan;
  categories: { slug: string; title: string; courseCount: number }[];
  goldGradient: string;
  busy: boolean;
  disabled: boolean;
  initialCategory?: string;
  onBuy: (planKey: string, categorySlug?: string) => void;
};

export function IndividualPlanCard({ plan, categories, goldGradient, busy, disabled, initialCategory, onBuy }: Props) {
  const needsCategory = plan.scope === "category";
  const [category, setCategory] = useState(
    initialCategory && categories.some((c) => c.slug === initialCategory) ? initialCategory : "",
  );
  const [hint, setHint] = useState("");
  const checkoutKey = plan.checkoutKey?.trim();
  const chosen = categories.find((c) => c.slug === category);

  const buy = () => {
    if (!checkoutKey) return;
    if (needsCategory && !category) {
      setHint("Please choose a category first.");
      return;
    }
    setHint("");
    onBuy(checkoutKey, needsCategory ? category : undefined);
  };

  return (
    <article className="lh-plan-card flex h-full flex-col rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_30px_rgba(249,177,77,0.2)] transition-all hover:-translate-y-0.5 hover:border-amber-300/75 hover:shadow-[0_0_42px_rgba(249,177,77,0.3)]">
      <p className="text-sm font-semibold text-amber-300">{plan.badge}</p>
      <p className="mt-1 text-sm text-gray-300">{plan.tagline}</p>
      <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.desc}</p>

      <div className="mt-5 rounded-xl border border-amber-500/25 bg-black/30 p-4">
        <p className="text-3xl font-extrabold text-white">{plan.price}</p>
        {plan.note ? <p className="mt-1 text-xs text-amber-100/90">{plan.note}</p> : null}
        {needsCategory ? (
          <div className="mt-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-100">
              <Layers className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              Choose your category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setHint("");
              }}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/70"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title} ({c.courseCount} course{c.courseCount === 1 ? "" : "s"})
                </option>
              ))}
            </select>
            {chosen ? (
              <p className="mt-2 text-xs text-emerald-300">
                {chosen.courseCount} self-paced course{chosen.courseCount === 1 ? "" : "s"} in {chosen.title} — plus any
                added during the year
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-emerald-300">
            {categories.reduce((n, c) => n + c.courseCount, 0)} self-paced courses across {categories.length} categories
          </p>
        )}
      </div>

      <ul className="mt-5 space-y-2 text-sm text-gray-200">
        {plan.features.filter(Boolean).map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <button
          type="button"
          disabled={disabled || !checkoutKey}
          onClick={buy}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-60 ${goldGradient}`}
        >
          {busy ? "Opening payment…" : plan.cta} <ChevronRight size={16} />
        </button>
        {hint ? <p className="mt-2 text-xs text-rose-300">{hint}</p> : null}
      </div>
    </article>
  );
}
