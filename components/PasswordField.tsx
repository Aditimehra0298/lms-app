"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-4 pr-11 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none";

type Props = {
  name: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export default function PasswordField({
  name,
  placeholder = "Password",
  required = true,
  autoComplete,
  minLength,
  className = "",
  value: controlledValue,
  onChange,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          minLength={minLength}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-200"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
