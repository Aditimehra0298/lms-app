"use client";

import { Trash2 } from "lucide-react";
import { orgTierRenewal, orgTierTotal, type HomePageOrgPlan } from "@/lib/content-schema";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60 focus:shadow-[0_0_16px_rgba(245,158,11,0.12)]";
const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
const itemCls =
  "rounded-xl border border-white/[0.07] bg-black/30 p-3 backdrop-blur-sm transition-all hover:border-white/15";
const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300";

/** Organisation plan cards exactly as shown on the home page and /subscriptions. */
export function AdminOrgPlansFields({
  plans,
  onChange,
}: {
  plans: HomePageOrgPlan[];
  onChange: (next: HomePageOrgPlan[]) => void;
}) {
  const setOrgPlanAt = (i: number, patch: Partial<HomePageOrgPlan>) =>
    onChange(plans.map((pl, idx) => (idx === i ? { ...pl, ...patch } : pl)));

  return (
    <>
      {plans.map((plan, idx) => (
        <div key={idx} className={`space-y-2 ${itemCls}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-200">Plan {idx + 1}</span>
            <button type="button" onClick={() => onChange(plans.filter((_, i) => i !== idx))} className={btnDanger} disabled={plans.length <= 1}><Trash2 size={13} /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2"><div><label className={labelCls}>Title</label><input className={inputCls} value={plan.title} onChange={(e) => setOrgPlanAt(idx, { title: e.target.value })} /></div><div><label className={labelCls}>Price (e.g. ₹2,50,000 / year or Custom pricing)</label><input className={inputCls} value={plan.price} onChange={(e) => setOrgPlanAt(idx, { price: e.target.value })} /></div></div>
          <div><label className={labelCls}>Tagline</label><input className={inputCls} value={plan.tagline} onChange={(e) => setOrgPlanAt(idx, { tagline: e.target.value })} /></div>
          <div><label className={labelCls}>Description</label><textarea className={inputCls} rows={5} value={plan.desc} onChange={(e) => setOrgPlanAt(idx, { desc: e.target.value })} placeholder="Press Enter for a new paragraph" /></div>
          <div className="grid gap-2 sm:grid-cols-3"><div><label className={labelCls}>Note</label><input className={inputCls} value={plan.note} onChange={(e) => setOrgPlanAt(idx, { note: e.target.value })} /></div><div><label className={labelCls}>Button text</label><input className={inputCls} value={plan.cta} onChange={(e) => setOrgPlanAt(idx, { cta: e.target.value })} /></div><div><label className={labelCls}>Button link</label><input className={inputCls} value={plan.href ?? ""} placeholder="/contact" onChange={(e) => setOrgPlanAt(idx, { href: e.target.value })} /></div></div>
          <div><label className={labelCls}>Features (one per line)</label><textarea className={inputCls} rows={3} value={plan.features.join("\n")} onChange={(e) => setOrgPlanAt(idx, { features: e.target.value.split("\n") })} /></div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div><label className={labelCls}>Online payment ID (empty = button uses link)</label><input className={inputCls} value={plan.checkoutKey ?? ""} placeholder="e.g. teams-annual-all-access" onChange={(e) => setOrgPlanAt(idx, { checkoutKey: e.target.value.trim() || undefined })} /></div>
            <div><label className={labelCls}>Employee seats</label><input type="number" min={1} className={inputCls} value={plan.seats ?? ""} onChange={(e) => setOrgPlanAt(idx, { seats: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><label className={labelCls}>Access (months)</label><input type="number" min={1} className={inputCls} value={plan.durationMonths ?? ""} onChange={(e) => setOrgPlanAt(idx, { durationMonths: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          {plan.checkoutKey ? <p className="text-[11px] text-amber-200/80">Organisations pay with Razorpay and get all self-paced courses for the seats and months set here. With seat tiers below, the tier price is used instead of Price. Use {"{seats}"} and {"{renewalPercent}"} in features.</p> : null}
          <div className="space-y-2 rounded-lg border border-white/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-gray-300">Seat tiers (price per employee × max employees)</span>
              <label className="flex items-center gap-2 text-[11px] text-gray-400">Renewal %<input type="number" min={0} max={100} className={`${inputCls} w-20`} value={plan.renewalPercent ?? ""} onChange={(e) => setOrgPlanAt(idx, { renewalPercent: e.target.value ? Number(e.target.value) : undefined })} /></label>
            </div>
            {(plan.tiers ?? []).map((tier, ti) => {
              const setTier = (patch: Partial<NonNullable<HomePageOrgPlan["tiers"]>[number]>) =>
                setOrgPlanAt(idx, { tiers: (plan.tiers ?? []).map((t, j) => (j === ti ? { ...t, ...patch } : t)) });
              return (
                <div key={ti} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-2">
                  <div><label className={labelCls}>From</label><input type="number" min={1} className={inputCls} value={tier.minSeats} onChange={(e) => setTier({ minSeats: Number(e.target.value) || 1 })} /></div>
                  <div><label className={labelCls}>To (max)</label><input type="number" min={1} className={inputCls} value={tier.maxSeats} onChange={(e) => setTier({ maxSeats: Number(e.target.value) || 1 })} /></div>
                  <div><label className={labelCls}>₹ per employee</label><input type="number" min={1} className={inputCls} value={tier.pricePerSeat} onChange={(e) => setTier({ pricePerSeat: Number(e.target.value) || 0 })} /></div>
                  <span className="pb-2 text-[11px] text-amber-200">
                    = ₹{orgTierTotal(tier).toLocaleString("en-IN")}
                    {plan.renewalPercent ? (
                      <span className="block text-[10px] text-gray-500">
                        renews ₹{orgTierRenewal(tier, plan.renewalPercent).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </span>
                  <button type="button" onClick={() => setOrgPlanAt(idx, { tiers: (plan.tiers ?? []).filter((_, j) => j !== ti) })} className={btnDanger}><Trash2 size={13} /></button>
                </div>
              );
            })}
            <button type="button" onClick={() => { const last = plan.tiers?.[plan.tiers.length - 1]; setOrgPlanAt(idx, { tiers: [...(plan.tiers ?? []), { minSeats: 1, maxSeats: (last?.maxSeats ?? 0) + 50, pricePerSeat: 999 }] }); }} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] font-semibold text-gray-200 hover:border-amber-400/50">+ Add tier</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...plans, { title: "New plan", tagline: "", desc: "", price: "", note: "", features: [], cta: "Contact Sales", href: "/contact" }])} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-amber-400/50">+ Add organisation plan</button>
    </>
  );
}
