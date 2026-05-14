import { ChevronDown } from "lucide-react";
import { LEVEL_FILTER_OPTIONS } from "@/lib/level-filter-options";

type LevelFilterSelectProps = {
  id?: string;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Variant matches courses listing vs category page surfaces */
  variant?: "courses" | "category";
  /** Override option list (e.g. from Admin → category page editor) */
  options?: ReadonlyArray<{ value: string; label: string }>;
};

export default function LevelFilterSelect({
  id,
  className = "",
  variant = "courses",
  options,
}: LevelFilterSelectProps) {
  const opts = options?.length ? options : LEVEL_FILTER_OPTIONS;
  const selectClass =
    variant === "category"
      ? "w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 py-3 pl-3 pr-10 text-sm text-gray-200 outline-none transition hover:border-white/20 focus:border-amber-500/35"
      : "w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/35 py-2.5 pl-3 pr-10 text-sm text-gray-200 outline-none focus:border-amber-400/40";

  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        id={id}
        name="level"
        defaultValue=""
        aria-label="Filter by level"
        className={selectClass}
      >
        {opts.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  );
}
