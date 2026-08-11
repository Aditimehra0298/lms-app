"use client";

import { useMemo, useState } from "react";
import { Eye, MoreVertical, Pencil, Plus, Ticket, Trash2, Users } from "lucide-react";
import type { AdminCoupon, AdminReferralCode, ManagedCourse, PromotionsConfig } from "@/lib/content-schema";
import {
  couponStatusLabel,
  emptyCoupon,
  emptyReferral,
  formatCouponDiscount,
  formatReferralCustomerDiscount,
  formatReferralReward,
  formatValidityRange,
  sanitizePromotions,
} from "@/lib/promotions";

type Props = {
  promotions?: PromotionsConfig;
  courses: ManagedCourse[];
  currentCourseSlug?: string;
  saving?: boolean;
  onSave: (next: PromotionsConfig) => Promise<boolean>;
};

const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40";
const labelCls = "text-[11px] font-medium text-gray-500";

function StatusBadge({ label }: { label: string }) {
  const on = label === "Active";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
        on ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/10 text-gray-400 ring-1 ring-white/10"
      }`}
    >
      {label}
    </span>
  );
}

export default function AdminCouponsReferralsPanel({
  promotions,
  courses,
  currentCourseSlug,
  saving,
  onSave,
}: Props) {
  const data = useMemo(() => sanitizePromotions(promotions ?? { coupons: [], referrals: [] }), [promotions]);
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [showAllRefs, setShowAllRefs] = useState(false);
  const [couponEditor, setCouponEditor] = useState<AdminCoupon | null>(null);
  const [refEditor, setRefEditor] = useState<AdminReferralCode | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const persist = async (next: PromotionsConfig) => {
    const ok = await onSave(sanitizePromotions(next));
    if (ok) {
      setCouponEditor(null);
      setRefEditor(null);
      setMenuId(null);
    }
  };

  const visibleCoupons = showAllCoupons ? data.coupons : data.coupons.slice(0, 3);
  const visibleRefs = showAllRefs ? data.referrals : data.referrals.slice(0, 3);

  const courseTitle = (slug?: string) => {
    if (!slug) return currentCourseSlug ? "This Course" : "Selected course";
    if (currentCourseSlug && slug === currentCourseSlug) return "This Course";
    return courses.find((c) => c.slug === slug)?.title ?? slug;
  };

  const saveCoupon = async () => {
    if (!couponEditor) return;
    const code = couponEditor.code.trim().toUpperCase();
    if (!code) return;
    const nextRow = { ...couponEditor, code };
    const exists = data.coupons.some((c) => c.id === nextRow.id);
    const coupons = exists
      ? data.coupons.map((c) => (c.id === nextRow.id ? nextRow : c))
      : [...data.coupons, nextRow];
    await persist({ ...data, coupons });
  };

  const saveReferral = async () => {
    if (!refEditor) return;
    const code = refEditor.code.trim().toUpperCase();
    if (!code) return;
    const nextRow = { ...refEditor, code };
    const exists = data.referrals.some((r) => r.id === nextRow.id);
    const referrals = exists
      ? data.referrals.map((r) => (r.id === nextRow.id ? nextRow : r))
      : [...data.referrals, nextRow];
    await persist({ ...data, referrals });
  };

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1224]">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ticket className="h-4 w-4 text-emerald-300" aria-hidden />
              Coupons
            </h3>
            <p className="mt-1 text-[11px] text-gray-500">Create and manage coupon codes for discounts.</p>
          </div>
          <button
            type="button"
            onClick={() => setCouponEditor(emptyCoupon(currentCourseSlug))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6f55ff] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#7d63ff]"
          >
            <Plus className="h-3.5 w-3.5" /> Create Coupon
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {["Code", "Discount", "Course", "Uses", "Validity", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visibleCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                visibleCoupons.map((c) => (
                  <tr key={c.id} className="text-gray-200">
                    <td className="px-3 py-2.5 font-semibold text-white">{c.code}</td>
                    <td className="px-3 py-2.5">{formatCouponDiscount(c)}</td>
                    <td className="px-3 py-2.5 text-gray-300">
                      {c.courseScope === "all" ? "All Courses" : courseTitle(c.courseSlug)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.uses} / {c.maxUses}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">{formatValidityRange(c.validFrom, c.validTo)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge label={couponStatusLabel(c)} />
                    </td>
                    <td className="relative px-3 py-2.5">
                      <div className="flex items-center gap-1 text-gray-400">
                        <button type="button" className="rounded p-1 hover:bg-white/10 hover:text-white" onClick={() => setCouponEditor(c)} aria-label="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 hover:bg-white/10 hover:text-white" onClick={() => setCouponEditor(c)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-white/10 hover:text-white"
                          onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                          aria-label="More"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {menuId === c.id ? (
                        <button
                          type="button"
                          className="absolute right-3 top-9 z-10 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#121a2e] px-2 py-1.5 text-[11px] text-rose-300 shadow-lg"
                          onClick={() => void persist({ ...data, coupons: data.coupons.filter((x) => x.id !== c.id) })}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.coupons.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllCoupons((v) => !v)}
            className="px-4 py-3 text-left text-[12px] font-semibold text-violet-300 hover:text-violet-200"
          >
            {showAllCoupons ? "Show fewer coupons" : "View all coupons →"}
          </button>
        ) : (
          <p className="px-4 py-3 text-[11px] text-gray-600">Coupons respect Base Price unless override is enabled.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1224]">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-amber-300" aria-hidden />
              Referral Codes
            </h3>
            <p className="mt-1 text-[11px] text-gray-500">Create and manage referral codes and commissions.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefEditor(emptyReferral())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6f55ff] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#7d63ff]"
          >
            <Plus className="h-3.5 w-3.5" /> Create Referral Code
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {["Code", "Customer Discount", "Referrer Reward", "Uses", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visibleRefs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No referral codes yet.
                  </td>
                </tr>
              ) : (
                visibleRefs.map((r) => (
                  <tr key={r.id} className="text-gray-200">
                    <td className="px-3 py-2.5 font-semibold text-white">{r.code}</td>
                    <td className="px-3 py-2.5">{formatReferralCustomerDiscount(r)}</td>
                    <td className="px-3 py-2.5">{formatReferralReward(r)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.uses}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge label={r.status === "active" ? "Active" : "Disabled"} />
                    </td>
                    <td className="relative px-3 py-2.5">
                      <div className="flex items-center gap-1 text-gray-400">
                        <button type="button" className="rounded p-1 hover:bg-white/10 hover:text-white" onClick={() => setRefEditor(r)} aria-label="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 hover:bg-white/10 hover:text-white" onClick={() => setRefEditor(r)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-white/10 hover:text-white"
                          onClick={() => setMenuId(menuId === r.id ? null : r.id)}
                          aria-label="More"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {menuId === r.id ? (
                        <button
                          type="button"
                          className="absolute right-3 top-9 z-10 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#121a2e] px-2 py-1.5 text-[11px] text-rose-300 shadow-lg"
                          onClick={() => void persist({ ...data, referrals: data.referrals.filter((x) => x.id !== r.id) })}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.referrals.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllRefs((v) => !v)}
            className="px-4 py-3 text-left text-[12px] font-semibold text-violet-300 hover:text-violet-200"
          >
            {showAllRefs ? "Show fewer referral codes" : "View all referral codes →"}
          </button>
        ) : (
          <p className="px-4 py-3 text-[11px] text-gray-600">Customer discount applies at checkout; referrer reward is tracked on uses.</p>
        )}
      </section>

      {couponEditor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setCouponEditor(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1528] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-white">{data.coupons.some((c) => c.id === couponEditor.id) ? "Edit coupon" : "Create coupon"}</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Code
                <input className={inputCls} value={couponEditor.code} onChange={(e) => setCouponEditor({ ...couponEditor, code: e.target.value.toUpperCase() })} />
              </label>
              <label className={labelCls}>
                Type
                <select
                  className={inputCls}
                  value={couponEditor.discountKind}
                  onChange={(e) => setCouponEditor({ ...couponEditor, discountKind: e.target.value as AdminCoupon["discountKind"] })}
                >
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className={labelCls}>
                Amount
                <input
                  type="number"
                  className={inputCls}
                  value={couponEditor.amount}
                  onChange={(e) => setCouponEditor({ ...couponEditor, amount: Number(e.target.value) || 0 })}
                />
              </label>
              {couponEditor.discountKind === "fixed" ? (
                <label className={labelCls}>
                  Currency
                  <input className={inputCls} value={couponEditor.currency ?? "INR"} onChange={(e) => setCouponEditor({ ...couponEditor, currency: e.target.value.toUpperCase() })} />
                </label>
              ) : null}
              <label className={labelCls}>
                Course
                <select
                  className={inputCls}
                  value={couponEditor.courseScope === "all" ? "all" : couponEditor.courseSlug || currentCourseSlug || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "all") setCouponEditor({ ...couponEditor, courseScope: "all", courseSlug: "" });
                    else setCouponEditor({ ...couponEditor, courseScope: "course", courseSlug: v });
                  }}
                >
                  <option value="all">All Courses</option>
                  {currentCourseSlug ? <option value={currentCourseSlug}>This Course</option> : null}
                  {courses.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelCls}>
                Max uses
                <input
                  type="number"
                  className={inputCls}
                  value={couponEditor.maxUses}
                  onChange={(e) => setCouponEditor({ ...couponEditor, maxUses: Number(e.target.value) || 1 })}
                />
              </label>
              <label className={labelCls}>
                Valid from
                <input type="date" className={inputCls} value={couponEditor.validFrom} onChange={(e) => setCouponEditor({ ...couponEditor, validFrom: e.target.value })} />
              </label>
              <label className={labelCls}>
                Valid to
                <input type="date" className={inputCls} value={couponEditor.validTo} onChange={(e) => setCouponEditor({ ...couponEditor, validTo: e.target.value })} />
              </label>
              <label className={labelCls}>
                Status
                <select
                  className={inputCls}
                  value={couponEditor.status}
                  onChange={(e) => setCouponEditor({ ...couponEditor, status: e.target.value as AdminCoupon["status"] })}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
              <input
                type="checkbox"
                checked={Boolean(couponEditor.allowBelowBase)}
                onChange={(e) => setCouponEditor({ ...couponEditor, allowBelowBase: e.target.checked })}
              />
              Allow discount below Base Price — Internal
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300" onClick={() => setCouponEditor(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !couponEditor.code.trim()}
                className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => void saveCoupon()}
              >
                {saving ? "Saving…" : "Save coupon"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {refEditor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setRefEditor(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1528] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-white">{data.referrals.some((r) => r.id === refEditor.id) ? "Edit referral code" : "Create referral code"}</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Code
                <input className={inputCls} value={refEditor.code} onChange={(e) => setRefEditor({ ...refEditor, code: e.target.value.toUpperCase() })} />
              </label>
              <label className={labelCls}>
                Status
                <select
                  className={inputCls}
                  value={refEditor.status}
                  onChange={(e) => setRefEditor({ ...refEditor, status: e.target.value as AdminReferralCode["status"] })}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className={labelCls}>
                Customer discount type
                <select
                  className={inputCls}
                  value={refEditor.customerDiscountKind}
                  onChange={(e) => setRefEditor({ ...refEditor, customerDiscountKind: e.target.value as AdminReferralCode["customerDiscountKind"] })}
                >
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className={labelCls}>
                Customer discount
                <input
                  type="number"
                  className={inputCls}
                  value={refEditor.customerDiscountAmount}
                  onChange={(e) => setRefEditor({ ...refEditor, customerDiscountAmount: Number(e.target.value) || 0 })}
                />
              </label>
              <label className={labelCls}>
                Referrer reward type
                <select
                  className={inputCls}
                  value={refEditor.rewardKind}
                  onChange={(e) => setRefEditor({ ...refEditor, rewardKind: e.target.value as AdminReferralCode["rewardKind"] })}
                >
                  <option value="percent">Percent commission</option>
                  <option value="fixed">Fixed per order</option>
                </select>
              </label>
              <label className={labelCls}>
                Referrer reward
                <input
                  type="number"
                  className={inputCls}
                  value={refEditor.rewardAmount}
                  onChange={(e) => setRefEditor({ ...refEditor, rewardAmount: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300" onClick={() => setRefEditor(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !refEditor.code.trim()}
                className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => void saveReferral()}
              >
                {saving ? "Saving…" : "Save referral"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
