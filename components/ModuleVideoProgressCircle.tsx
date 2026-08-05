"use client";

type Props = {
  /** 0–100 video watch progress for this module */
  percent: number;
  /** Module number shown in the center (omit / 0 to show percent) */
  moduleNumber?: number;
  completed?: boolean;
  locked?: boolean;
  selected?: boolean;
  size?: number;
  title?: string;
  /** Prefer showing percent text in the center instead of module number / tick */
  showPercentInCenter?: boolean;
  /** Ring only — no numeric text in the center */
  hideNumber?: boolean;
};

/**
 * Compact circular video-watch progress for each course module in the player sidebar.
 */
export default function ModuleVideoProgressCircle({
  percent,
  moduleNumber = 0,
  completed = false,
  locked = false,
  selected = false,
  size = 28,
  title,
  showPercentInCenter = false,
  hideNumber = false,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const stroke = size >= 40 ? 3.25 : 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  const track = locked
    ? "stroke-white/10"
    : completed || clamped >= 100
      ? "stroke-emerald-500/25"
      : selected
        ? "stroke-violet-400/25"
        : "stroke-white/15";
  const ring = locked
    ? "stroke-gray-500"
    : completed || clamped >= 100
      ? "stroke-emerald-400"
      : selected
        ? "stroke-violet-300"
        : clamped > 0
          ? "stroke-sky-400"
          : "stroke-white/25";
  const label = locked
    ? "text-gray-500"
    : completed || clamped >= 100
      ? "text-emerald-100"
      : selected
        ? "text-violet-100"
        : "text-gray-200";

  /** Always prefer the % number when requested — never a tick. */
  const showPct = !hideNumber && (showPercentInCenter || !moduleNumber);
  const center = locked
    ? "…"
    : hideNumber
      ? ""
      : showPct
        ? `${clamped}`
        : String(moduleNumber);

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={title ?? `Video progress ${clamped}%`}
      aria-label={title ?? `Module ${moduleNumber || ""} video progress ${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={`${ring} transition-[stroke-dasharray] duration-300`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold leading-none tabular-nums ${label} ${
          size >= 40 ? "text-[11px]" : "text-[9px]"
        }`}
      >
        {center}
        {showPct && !locked ? (
          <span className="text-[7px] opacity-80">%</span>
        ) : null}
      </span>
    </span>
  );
}
