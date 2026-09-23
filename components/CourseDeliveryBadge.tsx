type DeliveryKind = "self-paced" | "tutor-led";

const STYLES: Record<DeliveryKind, string> = {
  "self-paced":
    "border-amber-400/50 bg-amber-500 text-black shadow-[0_0_12px_rgba(249,177,77,0.35)]",
  "tutor-led":
    "border-violet-400/50 bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]",
};

const LABELS: Record<DeliveryKind, string> = {
  "self-paced": "Self-paced",
  "tutor-led": "Tutor-led",
};

export function CourseDeliveryBadge({
  kind,
  className = "",
}: {
  kind: DeliveryKind;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${STYLES[kind]} ${className}`}
    >
      {LABELS[kind]}
    </span>
  );
}
