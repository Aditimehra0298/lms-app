"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { TUTOR_LED_TRUST_BADGE_SRC } from "@/lib/tutor-led-marketing-assets";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";

type Props = {
  checkoutSlug?: string;
  enrolledLearning?: boolean;
};

/** Bottom reserve bar with trust badge — sits directly before the site footer. */
export default function TutorLedPreFooterReserveBar({
  checkoutSlug,
  enrolledLearning = false,
}: Props) {
  const router = useRouter();

  const reserve = () => {
    if (checkoutSlug && !enrolledLearning) registerTutorLedFromTemplate(router, checkoutSlug);
  };

  return (
    <section className="border-t border-white/10 bg-black" aria-label="Reserve your seat">
      <div className={`${shell} py-5 md:py-6`}>
        <div className="overflow-hidden rounded-2xl border border-[#FFB800]/35 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-black shadow-[0_0_40px_rgba(255,184,0,0.06)]">
          <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-6">
            <div className="flex items-center gap-4 lg:max-w-[340px]">
              <div className="relative h-16 w-16 shrink-0 sm:h-[72px] sm:w-[72px]">
                <Image
                  src={TUTOR_LED_TRUST_BADGE_SRC}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(255,184,0,0.25)]"
                  sizes="72px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#FFB800] sm:text-base">Trusted &amp; verified</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Secure enrollment · IEB-accredited certificates · verified credentials
                </p>
              </div>
            </div>

            <div className="text-center lg:flex-1 lg:px-4 lg:text-left">
              <h3 className="text-base font-bold text-white md:text-lg">Secure Your Spot in the Next Batch!</h3>
              <p className="mt-1 text-xs text-zinc-500 md:text-sm">
                Limited seats available for a personalized live learning experience.
              </p>
            </div>

            <div className="flex flex-col items-stretch sm:items-end lg:shrink-0">
              {!enrolledLearning && checkoutSlug ? (
                <button
                  type="button"
                  onClick={reserve}
                  className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_8px_28px_rgba(255,184,0,0.32)] transition hover:bg-[#e5a600]"
                >
                  Reserve Your Seat Now
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <Link
                  href="/my-learning?tab=live"
                  className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_8px_28px_rgba(255,184,0,0.32)] transition hover:bg-[#e5a600]"
                >
                  Open My Learning
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
