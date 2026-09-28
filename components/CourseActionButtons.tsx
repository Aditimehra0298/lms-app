"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { MouseEvent } from "react";
import { useSyncExternalStore } from "react";
import { KnowPriceButton } from "@/components/KnowPriceButton";
import { isLearnerLoggedIn, subscribeLearnerAuth } from "@/lib/learner-session-client";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";

/** Prevent card-level click handlers from firing; do not block link navigation. */
function stopBubble(e: MouseEvent) {
  e.stopPropagation();
}

const descriptionBtnCls =
  "course-description-btn inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-zinc-900/80 px-2 py-2.5 text-xs font-bold text-zinc-100 transition hover:border-violet-400/40 hover:text-violet-300 sm:px-3 sm:text-sm";

const enrollBtnCls =
  "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#f4c150] px-2 py-2.5 text-xs font-bold text-black shadow-[0_6px_20px_rgba(244,193,80,0.28)] transition hover:bg-[#f9d06a] sm:px-3 sm:text-sm";

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

export function CardEnrollButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} onClick={stopBubble} className={`${enrollBtnCls} ${className}`}>
      Enroll
    </Link>
  );
}

const buyAllBtnCls =
  "mt-2 inline-flex w-full items-center justify-center rounded-lg border border-[#f4c150]/50 bg-[#f4c150]/10 px-2 py-2 text-[11px] font-bold text-[#f4c150] transition hover:bg-[#f4c150]/20 sm:text-xs";

export function PriceDescriptionButtonRow({
  descriptionHref,
  onDescriptionClick,
  enrollHref,
  className = "",
  hideKnowPrice = false,
  buyAllSlugs,
}: {
  descriptionHref?: string;
  onDescriptionClick?: () => void;
  /** After login, show Enroll instead of a single catalog price */
  enrollHref?: string;
  /** After login, offer one checkout for every live batch on a catalog card */
  buyAllSlugs?: string[];
  className?: string;
  /** Hide regional pricing / change region control (e.g. tutor-led landing). */
  hideKnowPrice?: boolean;
}) {
  const { ready } = useLearnerPricing();
  const loggedIn = useSyncExternalStore(
    subscribeLearnerAuth,
    () => isLearnerLoggedIn(),
    () => false,
  );
  const showEnroll = Boolean(enrollHref) && ready && loggedIn;
  const showKnowPrice = !hideKnowPrice && !showEnroll;

  return (
    <div
      className={`flex w-full min-w-0 flex-col ${className}`}
      onClick={stopBubble}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex w-full min-w-0 gap-2">
        {showEnroll && enrollHref ? <CardEnrollButton href={enrollHref} /> : null}
        {showKnowPrice ? <KnowPriceButton /> : null}
        <DescriptionButton
          href={descriptionHref}
          onClick={onDescriptionClick}
          className={showKnowPrice || showEnroll ? "" : "flex-1"}
        />
      </div>
      {showEnroll && buyAllSlugs && buyAllSlugs.length > 1 && descriptionHref ? (
        <Link
          href={`${descriptionHref.split("#")[0]}#buy-all-batches`}
          onClick={stopBubble}
          className={buyAllBtnCls}
        >
          Choose 2, 3 or all batches
        </Link>
      ) : null}
    </div>
  );
}
