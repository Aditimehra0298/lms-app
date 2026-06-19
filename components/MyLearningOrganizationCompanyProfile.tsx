"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Globe2, Pencil, Target, Users } from "lucide-react";
import { CountryFlagImg } from "@/components/CountryFlagImg";
import {
  ORG_BRANDING_EVENT,
  readOrgCompanyBranding,
} from "@/lib/organization-achievements-branding";
import {
  buildOrganizationCompanyProfile,
  type OrganizationCompanyProfile,
} from "@/lib/organization-company-profile";
import type { LearnerAuthProfile } from "@/lib/auth-profile";

type Props = {
  profile: Pick<
    LearnerAuthProfile,
    "companyName" | "name" | "industryType" | "companySize" | "countryName" | "countryCode"
  >;
};

const surface =
  "rounded-xl border border-white/[0.07] bg-[#101018] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export function MyLearningOrganizationCompanyProfile({ profile }: Props) {
  const [logoTick, setLogoTick] = useState(0);

  const refreshLogo = useCallback(() => setLogoTick((n) => n + 1), []);

  useEffect(() => {
    window.addEventListener(ORG_BRANDING_EVENT, refreshLogo);
    return () => window.removeEventListener(ORG_BRANDING_EVENT, refreshLogo);
  }, [refreshLogo]);

  const companyProfile: OrganizationCompanyProfile = useMemo(() => {
    void logoTick;
    const branding = typeof window !== "undefined" ? readOrgCompanyBranding() : { badges: [] };
    return buildOrganizationCompanyProfile({
      profile,
      brandingLogoUrl: branding.logoUrl,
    });
  }, [profile, logoTick]);

  return (
    <article className={`overflow-hidden ${surface}`}>
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-violet-500/10 via-transparent to-amber-500/5 px-5 py-4 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Company profile
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          How your organisation appears to admins and on team training reports
        </p>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 sm:mx-0">
            {companyProfile.logoUrl ? (
              <Image
                src={companyProfile.logoUrl}
                alt={`${companyProfile.companyName} logo`}
                fill
                unoptimized={
                  companyProfile.logoUrl.startsWith("http") ||
                  companyProfile.logoUrl.startsWith("/uploads")
                }
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">
                <Building2 size={32} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                {companyProfile.companyName}
              </h2>
              {profile.countryCode?.trim() ? (
                <CountryFlagImg
                  code={profile.countryCode.trim()}
                  width={48}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : null}
            </div>
            <p className="mt-1.5 text-sm font-medium text-amber-200/90">{companyProfile.tagline}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-white/[0.06]">
                <Building2 size={12} className="text-violet-300/80" />
                {companyProfile.industryLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-white/[0.06]">
                <Users size={12} className="text-amber-300/80" />
                {companyProfile.sizeLabel}
              </span>
              {companyProfile.countryLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-white/[0.06]">
                  <Globe2 size={12} className="text-sky-300/80" />
                  {companyProfile.countryLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-center gap-2 sm:justify-end">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-300"
            >
              <Pencil size={13} />
              Edit profile
            </Link>
            <Link
              href="/my-learning?tab=achievements"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20"
            >
              Upload logo
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg bg-black/20 p-4 ring-1 ring-white/[0.05]">
            <h3 className="text-sm font-semibold text-white">What we do</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{companyProfile.whatWeDo}</p>
          </section>

          <section className="rounded-lg bg-black/20 p-4 ring-1 ring-white/[0.05]">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              <Target size={14} className="text-amber-300/90" />
              Focus areas
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {companyProfile.focusAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200 ring-1 ring-violet-500/20"
                >
                  {area}
                </li>
              ))}
            </ul>
            <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Training priorities
            </h4>
            <ul className="mt-2 space-y-1.5">
              {companyProfile.trainingPriorities.map((item) => (
                <li key={item} className="text-sm text-zinc-400">
                  · {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {companyProfile.logoSource === "default" ? (
          <p className="mt-4 text-[11px] text-zinc-600">
            Showing a sample company logo — upload your own on{" "}
            <Link href="/my-learning?tab=achievements" className="text-amber-400/90 hover:underline">
              Achievements
            </Link>{" "}
            or update industry details on{" "}
            <Link href="/profile" className="text-amber-400/90 hover:underline">
              Profile
            </Link>
            .
          </p>
        ) : null}
      </div>
    </article>
  );
}
