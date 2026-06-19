import { Award } from "lucide-react";

type Props = {
  label: string;
  className?: string;
};

export default function TestimonialCourseBadge({ label, className = "" }: Props) {
  const text = label.trim();
  if (!text) return null;

  return (
    <span
      className={`lh-testimonial-course-badge inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-400/55 bg-linear-to-r from-amber-500/20 via-amber-400/15 to-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100 shadow-[0_0_16px_rgba(249,177,77,0.18)] ${className}`}
    >
      <Award size={12} className="shrink-0 text-amber-300" aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  );
}
