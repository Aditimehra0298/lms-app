"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { MouseEvent } from "react";
import { KnowPriceButton } from "@/components/KnowPriceButton";

/** Prevent card-level click handlers from firing; do not block link navigation. */
function stopBubble(e: MouseEvent) {
  e.stopPropagation();
}

const descriptionBtnCls =
  "course-description-btn inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-zinc-900/80 px-2 py-2.5 text-xs font-bold text-zinc-100 transition hover:border-violet-400/40 hover:text-violet-300 sm:px-3 sm:text-sm";

export function DescriptionButton({
  className = "",
  href,
  onClick,
}: {
  className?: string;
  /** Opens the course landing / detail page */
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link
        href={href}
        onClick={stopBubble}
        className={`${descriptionBtnCls} ${className}`}
      >
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Description
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        stopBubble(e);
        onClick?.();
      }}
      className={`${descriptionBtnCls} ${className}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Description
    </button>
  );
}

export function PriceDescriptionButtonRow({
  descriptionHref,
  onDescriptionClick,
  className = "",
  hideKnowPrice = false,
}: {
  descriptionHref?: string;
  onDescriptionClick?: () => void;
  className?: string;
  /** Hide regional pricing / change region control (e.g. tutor-led landing). */
  hideKnowPrice?: boolean;
}) {
  const showKnowPrice = !hideKnowPrice;
  return (
    <div
      className={`flex w-full min-w-0 gap-2 ${className}`}
      onClick={stopBubble}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {showKnowPrice ? <KnowPriceButton /> : null}
      <DescriptionButton
        href={descriptionHref}
        onClick={onDescriptionClick}
        className={showKnowPrice ? "" : "flex-1"}
      />
    </div>
  );
}
