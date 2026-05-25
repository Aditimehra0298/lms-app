"use client";

import { useMemo, useState } from "react";
import { Coins, Globe, Percent, Plus, Trash2 } from "lucide-react";
import type { CourseRegionalPriceRow, ManagedCourse } from "@/lib/content-schema";
import AdminCurrencyBadge from "@/components/admin/AdminCurrencyBadge";
import AdminPriceInput from "@/components/admin/AdminPriceInput";
import {
  computeDiscountPercent,
  marketLabel,
  PRICING_MARKET_PRESETS,
  resolveCoursePrices,
} from "@/lib/course-regional-pricing";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { currencyDisplayForCountry, resolvePriceCurrency } from "@/lib/price-currency-detect";
import { listCountryOptions } from "@/lib/iso-country-list";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
};

export default function AdminRegionalPricingEditor({ draft, setDraft }: Props) {
  const [previewCountry, setPreviewCountry] = useState("IN");
  const [addCountry, setAddCountry] = useState("");

  const rows = draft.regionalPrices ?? [];
  const globalDiscount = computeDiscountPercent(draft.price, draft.oldPrice);
  const defaultCurrency = resolvePriceCurrency(draft.price);

  const previewResolved = useMemo(
    () => resolveCoursePrices(draft, pricingRegionForCountry(previewCountry)),
    [draft, previewCountry],
  );
  const previewCurrency = currencyDisplayForCountry(previewCountry);

  const usedCodes = new Set(rows.map((r) => r.countryCode.toUpperCase()));
  const countryOptions = listCountryOptions().filter((c) => !usedCodes.has(c.code));

  const updateRow = (index: number, patch: Partial<CourseRegionalPriceRow>) => {
    setDraft((d) => {
      const next = [...(d.regionalPrices ?? [])];
      next[index] = { ...next[index], ...patch };
      return { ...d, regionalPrices: next };
    });
  };

  const removeRow = (index: number) => {
    setDraft((d) => ({
      ...d,
      regionalPrices: (d.regionalPrices ?? []).filter((_, i) => i !== index),
    }));
  };

  const addPreset = (code: string) => {
    if (usedCodes.has(code)) return;
    const preset = PRICING_MARKET_PRESETS.find((p) => p.code === code);
    const hint = preset?.currencyHint ?? "";
    setDraft((d) => ({
      ...d,
      regionalPrices: [
        ...(d.regionalPrices ?? []),
        {
          countryCode: code,
          price: d.price || `${hint}0`,
          oldPrice: d.oldPrice || "",
        },
      ],
    }));
  };

  const addCustomCountry = () => {
    const code = addCountry.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || usedCodes.has(code)) return;
    const cur = currencyDisplayForCountry(code);
    setDraft((d) => ({
      ...d,
      regionalPrices: [
        ...(d.regionalPrices ?? []),
        {
          countryCode: code,
          price: d.price || `${cur.symbol}0`,
          oldPrice: d.oldPrice || "",
        },
      ],
    }));
    setAddCountry("");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Coins className="h-4 w-4 text-amber-300" aria-hidden />
          <h3 className="text-sm font-semibold text-white">Default prices (all countries)</h3>
          <AdminCurrencyBadge currency={defaultCurrency} size="md" showName />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Base currency is detected from symbols (₹ INR, $ USD, € EUR, £ GBP). Other countries without a row get
          converted from this amount.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AdminPriceInput
            label="Sale price (current)"
            value={draft.price}
            onChange={(price) => setDraft((d) => ({ ...d, price }))}
            placeholder="₹4,999 or $49"
            inputClassName="border-emerald-500/25 text-emerald-100"
          />
          <AdminPriceInput
            label="List price (original — strikethrough)"
            value={draft.oldPrice}
            onChange={(oldPrice) => setDraft((d) => ({ ...d, oldPrice }))}
            placeholder="₹7,999 or $89"
          />
        </div>
        {globalDiscount != null ? (
          <p className="mt-2 text-[11px] text-emerald-300/90">
            Default discount: <strong>{globalDiscount}% off</strong> (list higher than sale)
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-[#0d1528] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Globe className="h-4 w-4 text-violet-300" aria-hidden />
              Prices by country &amp; currency
            </h3>
            <p className="mt-1 max-w-xl text-[11px] text-gray-500">
              Each row uses that country&apos;s currency (Indian Rupee, US Dollar, Euro, etc.). Icons update as you
              type.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRICING_MARKET_PRESETS.map((m) => (
            <button
              key={m.code}
              type="button"
              disabled={usedCodes.has(m.code)}
              onClick={() => addPreset(m.code)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-medium text-gray-300 hover:border-violet-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>+ {marketLabel(m.code)}</span>
              <span className="text-gray-500">({m.currencyCode})</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[140px] flex-1">
            <span className="text-[11px] text-gray-500">Add another country</span>
            <select
              value={addCountry}
              onChange={(e) => setAddCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/35"
            >
              <option value="">Select…</option>
              {countryOptions.map((c) => {
                const cur = currencyDisplayForCountry(c.code);
                return (
                  <option key={c.code} value={c.code}>
                    {c.name} — {cur.code} ({cur.symbol})
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            onClick={addCustomCountry}
            disabled={!addCountry}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add country
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-gray-500">
            No country overrides yet — default prices apply everywhere.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 font-semibold">Country</th>
                  <th className="px-2 py-2 font-semibold">Currency</th>
                  <th className="px-2 py-2 font-semibold">Sale price</th>
                  <th className="px-2 py-2 font-semibold">List price</th>
                  <th className="px-2 py-2 font-semibold">Discount</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const pct = computeDiscountPercent(row.price, row.oldPrice ?? "");
                  const rowCurrency = currencyDisplayForCountry(row.countryCode);
                  return (
                    <tr key={`${row.countryCode}-${index}`} className="border-b border-white/5">
                      <td className="px-2 py-2 font-medium text-violet-200">
                        {marketLabel(row.countryCode)}
                        <span className="ml-1 text-gray-600">({row.countryCode})</span>
                      </td>
                      <td className="px-2 py-2">
                        <AdminCurrencyBadge currency={rowCurrency} size="md" />
                      </td>
                      <td className="px-2 py-2">
                        <AdminPriceInput
                          value={row.price}
                          onChange={(price) => updateRow(index, { price })}
                          countryCode={row.countryCode}
                          placeholder={`${rowCurrency.symbol}4,999`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <AdminPriceInput
                          value={row.oldPrice ?? ""}
                          onChange={(oldPrice) => updateRow(index, { oldPrice })}
                          countryCode={row.countryCode}
                          placeholder={`${rowCurrency.symbol}7,999`}
                        />
                      </td>
                      <td className="px-2 py-2 tabular-nums text-emerald-300/90">
                        {pct != null ? `${pct}% off` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="rounded p-1.5 text-gray-500 hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label={`Remove ${row.countryCode}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Percent className="h-4 w-4 text-amber-300" aria-hidden />
            Storefront preview
            <AdminCurrencyBadge currency={previewCurrency} />
          </h3>
          <label className="flex items-center gap-2 text-[11px] text-gray-400">
            Preview as
            <select
              value={previewCountry}
              onChange={(e) => setPreviewCountry(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-white"
            >
              {[...PRICING_MARKET_PRESETS.map((p) => p.code), ...rows.map((r) => r.countryCode)]
                .filter((c, i, a) => a.indexOf(c) === i)
                .map((code) => {
                  const cur = currencyDisplayForCountry(code);
                  return (
                    <option key={code} value={code}>
                      {marketLabel(code)} — {cur.code}
                    </option>
                  );
                })}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <span className="text-2xl font-extrabold text-white">{previewResolved.price || "—"}</span>
          {previewResolved.oldPrice ? (
            <span className="text-sm text-zinc-500 line-through">{previewResolved.oldPrice}</span>
          ) : null}
          {previewResolved.discountPercent != null ? (
            <span className="rounded bg-violet-600/90 px-2 py-0.5 text-[11px] font-bold text-white">
              {previewResolved.discountPercent}% OFF
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-gray-500">
          {previewResolved.isRegionalOverride
            ? `Using ${previewCurrency.name} (${previewCurrency.code}) prices from the table above.`
            : `Using default price converted to ${previewCurrency.name} (${previewCurrency.code}).`}
        </p>
      </aside>
    </div>
  );
}
