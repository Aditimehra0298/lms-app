"use client";

type Option = { id: string; label: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  className?: string;
};

export function AdminModeToggle({ label, value, options, onChange, className = "" }: Props) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              value === opt.id
                ? "bg-violet-500/30 text-violet-100"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
