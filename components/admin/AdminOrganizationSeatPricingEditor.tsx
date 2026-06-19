"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import type { ManagedCourse, OrganizationSeatBandId } from "@/lib/content-schema";
import AdminCurrencyBadge from "@/components/admin/AdminCurrencyBadge";
import AdminPriceInput from "@/components/admin/AdminPriceInput";
import { ORGANIZATION_SEAT_BANDS } from "@/lib/organization-course-pricing";
import { pricingRegionForCountry } from "@/lib/country-pricing";
import { listCountryOptions } from "@/lib/iso-country-list";
import { resolveOrganizationCoursePrice } from "@/lib/organization-course-pricing";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
};

export default function AdminOrganizationSeatPricingEditor({ draft, setDraft }: Props) {
  const [previewCountry, setPreviewCountry] = useState("IN");
  const [previewBand, setPreviewBand] = useState<OrganizationSeatBandId>("1-10");
  const [addCountry, setAddCountry] = useState("");

  const rows = draft.organizationSeatPricing ?? [];
  const preview = useMemo(
    () =>
      resolveOrganizationCoursePrice(
        draft,
        pricingRegionForCountry(previewCountry),
        previewBand,
      ),
    [draft, previewCountry, previewBand],
  );

  const addRow = (countryCode: string, bandId: OrganizationSeatBandId) => {
    const code = countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return;
    const exists = rows.some((r) => r.countryCode === code && r.bandId === bandId);
    if (exists) return;
    setDraft((d) => ({
      ...d,
      organizationSeatPricing: [
        ...(d.organizationSeatPricing ?? []),
        { countryCode: code, bandId, price: d.price || "₹0", oldPrice: d.oldPrice || "" },
      ],
    }));
  };

  const updateRow = (index: number, patch: Partial<(typeof rows)[0]>) => {
    setDraft((d) => {
      const next = [...(d.organizationSeatPricing ?? [])];
      next[index] = { ...next[index], ...patch };
      return { ...d, organizationSeatPricing: next };
    });
  };

  const removeRow = (index: number) => {
    setDraft((d) => ({
      ...d,
      organizationSeatPricing: (d.organizationSeatPricing ?? []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="mt-6 rounded-xl border border-amber-500/20 bg-[#0b1224] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Building2 className="h-5 w-5 text-amber-300" />
            Organisation team pricing (seat bands)
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-gray-400">
            Set prices per <strong className="text-gray-300">country/region</strong> and{" "}
            <strong className="text-gray-300">employee band</strong> (1–10, 11–20, …). Individual
            regional prices above are unchanged. Organisation buyers see price only after they pick
            region + team size.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Preview country</label>
          <select
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
            value={previewCountry}
            onChange={(e) => setPreviewCountry(e.target.value)}
          >
            {listCountryOptions().map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Preview band</label>
          <select
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
            value={previewBand}
            onChange={(e) => setPreviewBand(e.target.value as OrganizationSeatBandId)}
          >
            {ORGANIZATION_SEAT_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-300">
          Preview:{" "}
          <span className="font-semibold text-amber-200">
            {preview.ready ? preview.price : preview.message ?? "—"}
          </span>
          {preview.isAdminConfigured ? (
            <span className="ml-2 text-emerald-400">(admin row)</span>
          ) : preview.ready ? (
            <span className="ml-2 text-gray-500">(auto-scaled)</span>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {ORGANIZATION_SEAT_BANDS.map((band) => (
          <button
            key={band.id}
            type="button"
            onClick={() => addRow(previewCountry, band.id)}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-gray-300 hover:border-amber-400/40"
          >
            <Plus size={12} />
            {previewCountry} · {band.id}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-xs text-gray-500">
          No organisation seat prices yet. Quick-add a country + band above, or leave empty to auto-scale
          from individual regional price.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={`${row.countryCode}-${row.bandId}-${index}`}
              className="grid gap-2 rounded-lg border border-white/10 bg-black/25 p-3 md:grid-cols-[80px_100px_1fr_1fr_auto]"
            >
              <div className="flex items-center gap-1 text-xs text-gray-300">
                <AdminCurrencyBadge countryCode={row.countryCode} />
                {row.countryCode}
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-200">
                <Users size={12} />
                {row.bandId}
              </div>
              <AdminPriceInput
                label="Team price"
                value={row.price}
                onChange={(price) => updateRow(index, { price })}
              />
              <AdminPriceInput
                label="List price"
                value={row.oldPrice ?? ""}
                onChange={(oldPrice) => updateRow(index, { oldPrice })}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="self-end rounded-md border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
                aria-label="Remove row"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
          value={addCountry}
          onChange={(e) => setAddCountry(e.target.value)}
        >
          <option value="">Add country…</option>
          {listCountryOptions().map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!addCountry}
          onClick={() => {
            addRow(addCountry, "1-10");
            setAddCountry("");
          }}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-gray-200 disabled:opacity-40"
        >
          Add country row
        </button>
      </div>
    </div>
  );
}
