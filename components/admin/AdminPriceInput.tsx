"use client";

import AdminCurrencyBadge from "@/components/admin/AdminCurrencyBadge";
import { resolvePriceCurrency } from "@/lib/price-currency-detect";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  countryCode?: string;
  inputClassName?: string;
  label?: string;
  hint?: string;
};

const baseInput =
  "w-full rounded-lg border border-white/10 bg-black/40 py-2 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/35";

export default function AdminPriceInput({
  value,
  onChange,
  placeholder,
  countryCode,
  inputClassName = "",
  label,
  hint,
}: Props) {
  const currency = resolvePriceCurrency(value, countryCode);

  return (
    <label className="block">
      {label ? (
        <span className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          {label}
          <AdminCurrencyBadge currency={currency} />
        </span>
      ) : null}
      <div className="relative">
        <div className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2">
          <AdminCurrencyBadge currency={currency} showCode={false} />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? `${currency.symbol}0`}
          className={`${baseInput} pl-[3.25rem] ${inputClassName}`}
        />
      </div>
      {hint ? <p className="mt-1 text-[10px] text-gray-600">{hint}</p> : null}
    </label>
  );
}
