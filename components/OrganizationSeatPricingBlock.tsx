"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { CoursePrice } from "@/components/CoursePrice";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { resolveOrganizationCoursePriceBySeatCount } from "@/lib/organization-course-pricing";

type Props = {
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices" | "organizationSeatPricing" | "slug" | "title">;
  /** Controlled seat count (optional). */
  seatCount?: number | "";
  onSeatCountChange?: (value: number | "") => void;
  /** Match course landing purchase card layout (no band hints). */
  variant?: "default" | "purchase-card";
};

export function OrganizationSeatPricingBlock({
  course,
  seatCount: controlledSeats,
  onSeatCountChange,
  variant = "default",
}: Props) {
  const { region, showPrices, ready } = useLearnerPricing();
  const [internalSeats, setInternalSeats] = useState<number | "">("");
  const seatInput = controlledSeats !== undefined ? controlledSeats : internalSeats;
  const isPurchaseCard = variant === "purchase-card";

  const setSeatInput = (value: number | "") => {
    if (onSeatCountChange) onSeatCountChange(value);
    else setInternalSeats(value);
  };

  const numericSeats = typeof seatInput === "number" && seatInput > 0 ? seatInput : null;

  const resolved = useMemo(
    () => resolveOrganizationCoursePriceBySeatCount(course, region, numericSeats),
    [course, region, numericSeats],
  );

  return (
    <div className={isPurchaseCard ? "space-y-3" : "space-y-4"}>
      <div>
        <label
          htmlFor={`org-seats-${course.slug}`}
          className={`flex items-center gap-2 font-semibold text-white ${
            isPurchaseCard ? "mb-2 text-sm" : "mb-1.5 text-sm"
          }`}
        >
          <Users size={16} className="text-amber-300" />
          How many employees do you want to enroll?
        </label>
        <input
          id={`org-seats-${course.slug}`}
          type="number"
          min={1}
          max={999}
          inputMode="numeric"
          placeholder="e.g. 15"
          value={seatInput === "" ? "" : seatInput}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              setSeatInput("");
              return;
            }
            const n = Number.parseInt(raw, 10);
            setSeatInput(Number.isFinite(n) && n > 0 ? n : "");
          }}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50"
        />
      </div>

      {!ready ? (
        <div className="h-9 animate-pulse rounded-lg bg-zinc-800" />
      ) : !showPrices || !region ? (
        <p className="text-xs text-gray-500">Sign in to see team pricing.</p>
      ) : !numericSeats ? (
        <p className="text-xs text-zinc-400">Enter the number of employees to see your team price.</p>
      ) : resolved.ready ? (
        <div>
          {isPurchaseCard ? (
            <div className="flex flex-wrap items-end gap-2">
              <CoursePrice label={resolved.price} exactLabel className="text-3xl font-extrabold text-white" />
              {resolved.oldPrice ? (
                <CoursePrice
                  label={resolved.oldPrice}
                  exactLabel
                  className="text-sm text-zinc-500 line-through"
                />
              ) : null}
              {resolved.discountPercent != null ? (
                <span className="rounded bg-violet-600/90 px-2 py-0.5 text-[11px] font-bold text-white">
                  {resolved.discountPercent}% OFF
                </span>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-gray-500">Team price</p>
              <p className="text-3xl font-bold text-amber-200">{resolved.price}</p>
              {resolved.oldPrice ? (
                <p className="text-sm text-gray-500 line-through">{resolved.oldPrice}</p>
              ) : null}
              {resolved.discountPercent != null ? (
                <span className="mt-1 inline-block rounded bg-violet-600/90 px-2 py-0.5 text-[11px] font-bold text-white">
                  {resolved.discountPercent}% OFF
                </span>
              ) : null}
            </>
          )}
          <p className="mt-1 text-[11px] text-zinc-500">For {numericSeats} employees</p>
        </div>
      ) : (
        <p className="text-xs text-rose-300/90">{resolved.message}</p>
      )}
    </div>
  );
}

/** Whether org purchase is ready (region + seats + price). */
export function isOrganizationPurchaseReady(
  course: Pick<ManagedCourse, "price" | "oldPrice" | "regionalPrices" | "organizationSeatPricing">,
  region: ReturnType<typeof useLearnerPricing>["region"],
  seatCount: number | "",
): boolean {
  const n = typeof seatCount === "number" && seatCount > 0 ? seatCount : null;
  if (!n) return false;
  const resolved = resolveOrganizationCoursePriceBySeatCount(course, region, n);
  return resolved.ready;
}
