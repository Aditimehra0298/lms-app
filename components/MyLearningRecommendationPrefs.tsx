"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { LearnerProfileSettingsEditor } from "@/components/LearnerProfileSettingsEditor";
import type { LearnerAuthProfile } from "@/lib/auth-profile";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";

type Props = {
  profile: LearnerAuthProfile;
  onProfileUpdated?: () => void;
};

/** Dashboard shortcut — full edit on /profile */
export function MyLearningRecommendationPrefs({ profile, onProfileUpdated }: Props) {
  const initialProfile: LmsUserProfilePayload | null = profile.email
    ? {
        email: profile.email,
        name: profile.name ?? null,
        role: profile.role ?? "learner",
        accountType: profile.accountType ?? "individual",
        avatarUrl: profile.avatarUrl ?? null,
        phone: profile.phone ?? null,
        companyName: profile.companyName ?? null,
        personalEmail: profile.personalEmail ?? null,
        industryType: profile.industryType ?? null,
        companySize: profile.companySize ?? null,
        countryCode: profile.countryCode ?? null,
        countryName: profile.countryName ?? null,
        lastLoginAt: null,
        emailVerifiedAt: null,
        createdAt: new Date().toISOString(),
      }
    : null;

  return (
    <article className="mt-4 w-full rounded-xl border border-violet-500/25 bg-linear-to-br from-violet-500/10 via-black/30 to-black/40 p-4 sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">Profile & recommendations</h3>
          <p className="mt-1 text-xs text-gray-400">
            Update your organisation, industry, and interests to see the best courses from our catalog first.
          </p>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-white/5"
        >
          <Settings2 size={14} />
          Full settings
        </Link>
      </div>
      {initialProfile ? (
        <LearnerProfileSettingsEditor
          compact
          initialProfile={initialProfile}
          onSaved={() => onProfileUpdated?.()}
        />
      ) : (
        <p className="text-sm text-gray-400">
          <Link href="/profile" className="text-amber-300 underline">
            Sign in and open profile settings
          </Link>{" "}
          to personalize recommendations.
        </p>
      )}
    </article>
  );
}
