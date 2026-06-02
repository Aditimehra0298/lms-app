"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CountryFlagImg } from "@/components/CountryFlagImg";
import {
  dialCodeForCountry,
  formatStoredPhone,
  listPhoneCountryOptions,
} from "@/lib/phone-dial-codes";

type Props = {
  countryCode: string;
  onCountryChange: (code: string) => void;
  onPhoneChange?: (fullPhone: string) => void;
  className?: string;
};

export default function PhoneWithCountryCode({
  countryCode,
  onCountryChange,
  onPhoneChange,
  className = "",
}: Props) {
  const options = useMemo(() => listPhoneCountryOptions(), []);
  const [nationalNumber, setNationalNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 144 });
  const pickerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.code === countryCode);

  useEffect(() => {
    if (!countryCode && options.length > 0) {
      onCountryChange(options.find((o) => o.code === "IN")?.code ?? options[0]!.code);
    }
  }, [countryCode, options, onCountryChange]);

  const storedPhone = countryCode ? formatStoredPhone(countryCode, nationalNumber) : "";

  useEffect(() => {
    onPhoneChange?.(storedPhone);
  }, [storedPhone, onPhoneChange]);

  useLayoutEffect(() => {
    if (!open || !pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 144),
    });
  }, [open, countryCode]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-country-menu]")) return;
      setOpen(false);
    };
    const reposition = () => {
      if (!pickerRef.current) return;
      const rect = pickerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 144) });
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const countryMenu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            data-country-menu
            role="listbox"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            className="z-[9999] max-h-52 overflow-y-auto rounded-lg border border-white/20 bg-zinc-900 py-1 shadow-2xl"
          >
            {options.map((o) => {
              const active = o.code === countryCode;
              return (
                <li key={o.code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onCountryChange(o.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-amber-500/15 ${
                      active ? "bg-amber-500/20 text-amber-100" : "text-zinc-200"
                    }`}
                  >
                    <CountryFlagImg code={o.code} />
                    <span className="font-medium">{o.code}</span>
                    <span className="text-xs text-zinc-500">+{o.dial}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-400">Mobile number</span>
        <div className="flex rounded-xl border border-white/15 bg-black/40 focus-within:border-amber-400/50">
          <div ref={pickerRef} className="relative shrink-0 border-r border-white/15">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label="Country code"
              onClick={() => setOpen((v) => !v)}
              className="flex h-full min-w-[5.25rem] items-center gap-1.5 bg-zinc-900 py-3 pl-2.5 pr-2 text-sm font-medium text-amber-100 hover:bg-zinc-800"
            >
              <CountryFlagImg code={countryCode} />
              <span className="tracking-wide">{countryCode || "—"}</span>
              <span className="ml-auto text-[10px] text-zinc-500" aria-hidden>
                ▾
              </span>
            </button>

            {countryMenu}
          </div>

          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={
              countryCode
                ? `e.g. ${dialCodeForCountry(countryCode) === "91" ? "9876543210" : "5551234567"}`
                : "Phone number"
            }
            value={nationalNumber}
            onChange={(e) => setNationalNumber(e.target.value.replace(/[^\d\s-]/g, ""))}
            className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-4 py-3 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </label>
    </div>
  );
}
