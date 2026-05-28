"use client";

import { BadgeCheck, CreditCard, MapPin, Sparkles } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

type Props = {
  draft: ManagedCourse;
  canEdit: boolean;
  onGoCourseInfo: () => void;
};

export default function AdminCourseSubscriptionPanel({ draft, canEdit, onGoCourseInfo }: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Subscription" onGoCourseInfo={onGoCourseInfo} />;
  }

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Subscription & badges"
      description="Configure subscription lifecycle, certificate tracker hooks, and learner badge tiers."
      icon={<CreditCard className="h-6 w-6 text-emerald-300" aria-hidden />}
    >
      <AdminPanelSection title="Payment provider status">
        <p className="text-xs text-gray-400">
          Debit/payment gateway connection can be finalized once your provider approvals are ready. This tab is now
          reserved for that integration.
        </p>
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          Next step: connect webhook to persist <strong>amount paid</strong>, <strong>transaction ID</strong>, and{" "}
          <strong>subscription status</strong> in admin tables.
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Certificate tracker hook">
        <p className="text-xs text-gray-400">
          Use your certificate generator callback here later. Current certificate generation remains under the{" "}
          <strong className="text-gray-300">Certificates</strong> tab.
        </p>
        <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 p-3 text-xs text-violet-100">
          Suggested payload keys: <code>registrationId</code>, <code>courseSlug</code>, <code>badgeTier</code>,{" "}
          <code>certificateNumber</code>, <code>pdfUrl</code>.
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Learner badge tiers">
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { label: "Bronze", hint: "Course completed" },
            { label: "Silver", hint: "Completion + exam >= 75%" },
            { label: "Gold", hint: "Completion + exam >= 90%" },
          ].map((tier) => (
            <div key={tier.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-100">
                <BadgeCheck className="h-4 w-4" />
                {tier.label}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">{tier.hint}</p>
            </div>
          ))}
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Geo pricing reminder">
        <p className="inline-flex items-center gap-2 text-xs text-gray-300">
          <MapPin className="h-4 w-4 text-cyan-300" />
          Country-based pricing is already managed in <strong>Pricing</strong> via regional prices.
        </p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="h-4 w-4 text-violet-300" />
          This tab focuses on subscription and post-payment badge automation.
        </p>
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}

