"use client";

import AdminOrganizationSeatPricingEditor from "@/components/admin/AdminOrganizationSeatPricingEditor";
import AdminRegionalPricingEditor from "@/components/admin/AdminRegionalPricingEditor";
import type { ManagedCourse } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { applyTutorLedPricingDraft, tutorLedPricingCourse } from "@/lib/tutor-led-pricing";

type Props = {
  draft: TutorLedProgramStored;
  setDraft: React.Dispatch<React.SetStateAction<TutorLedProgramStored | null>>;
};

export function AdminTutorLedPricingPanel({ draft, setDraft }: Props) {
  const pricing = tutorLedPricingCourse(draft);

  const setPricing: React.Dispatch<React.SetStateAction<ManagedCourse>> = (action) => {
    setDraft((current) => {
      if (!current) return current;
      const prev = tutorLedPricingCourse(current);
      const next = typeof action === "function" ? action(prev) : action;
      return applyTutorLedPricingDraft(current, next);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <h3 className="text-sm font-semibold text-white">Pricing by country &amp; currency</h3>
        <p className="mt-1 max-w-2xl text-xs text-gray-400">
          Same as self-paced: rack, standard, and base prices, plus India (₹), US ($), and other countries.
          The India row also updates the public INR price on the live landing.
        </p>
      </div>
      <AdminRegionalPricingEditor draft={pricing} setDraft={setPricing} />
      <AdminOrganizationSeatPricingEditor draft={pricing} setDraft={setPricing} />
      <label className="block rounded-xl border border-white/10 bg-[#0d1528] p-4">
        <span className="text-[11px] text-gray-500">Enrolled price shown in My Learning (₹)</span>
        <input
          type="number"
          value={draft.priceAfterPayment ?? draft.price}
          onChange={(e) =>
            setDraft({ ...draft, priceAfterPayment: Number(e.target.value) || 0 })
          }
          className="mt-1 w-full max-w-xs rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
        />
        <p className="mt-1 text-[10px] text-gray-600">
          After payment only. Checkout uses the country prices above.
        </p>
      </label>
    </div>
  );
}
