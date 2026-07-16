"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Save, Sparkles, UserRound } from "lucide-react";
import type { LearnerAuthProfile } from "@/lib/auth-profile";
import { cacheLearnerProfile, learnerProfileFromDb } from "@/lib/auth-profile";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  LEARNING_GOAL_OPTIONS,
  LEARNING_INTEREST_OPTIONS,
  LEARNING_PREFS_EVENT,
  readLearningPreferences,
  writeLearningPreferences,
} from "@/lib/learner-learning-preferences";
import {
  emptyProfileForm,
  PROFILE_COMPANY_SIZE_OPTIONS,
  PROFILE_INDUSTRY_OPTIONS,
  profileFieldClass,
  profileFormFromPayload,
  profileLabelClass,
  type LearnerProfileFormValues,
} from "@/lib/learner-profile-form";
import { profileSummaryLine } from "@/lib/learner-profile-recommendation-signals";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import { readJsonResponse } from "@/lib/safe-json";

type Props = {
  initialProfile?: LmsUserProfilePayload | null;
  compact?: boolean;
  onSaved?: (profile: LearnerAuthProfile) => void;
};

export function LearnerProfileSettingsEditor({ initialProfile, compact = false, onSaved }: Props) {
  const [form, setForm] = useState<LearnerProfileFormValues>(emptyProfileForm());
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountType = initialProfile?.accountType ?? "individual";
  const isIndividual = accountType === "individual";
  const isOrganisation = accountType === "organisation";
  const email = initialProfile?.email ?? getLearnerEmail() ?? "";

  useEffect(() => {
    if (initialProfile) {
      setForm(profileFormFromPayload(initialProfile));
    }
    const prefs = readLearningPreferences();
    setInterests(prefs.interests);
    setGoal(prefs.goal);
  }, [initialProfile]);

  const summary = useMemo(
    () =>
      profileSummaryLine({
        accountType: accountType as LearnerAuthProfile["accountType"],
        industryType: form.industryType,
        companyName: form.companyName,
        companySize: form.companySize,
        categorySlugs: new Set(),
        profileKeywords: [],
        organizationLabel: form.companyName || null,
      }),
    [accountType, form],
  );

  const patch = (key: keyof LearnerProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
    setSaved(false);
  };

  const save = async () => {
    if (!email) {
      setError("Sign in again to save your profile.");
      return;
    }
    setSaving(true);
    setError(null);

    writeLearningPreferences({ interests, goal });

    try {
      const res = await fetch("/api/learner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: form.name.trim() || null,
          phone: form.phone.trim() || null,
          companyName: form.companyName.trim() || null,
          personalEmail: form.personalEmail.trim() || null,
          industryType: form.industryType.trim() || null,
          companySize: form.companySize.trim() || null,
        }),
      });
      const data = await readJsonResponse(res, {} as {
        ok?: boolean;
        profile?: LmsUserProfilePayload;
        message?: string;
      });

      if (res.ok && data.ok && data.profile) {
        const learner = learnerProfileFromDb(data.profile);
        cacheLearnerProfile(learner);
        window.dispatchEvent(new Event("sft_auth_updated"));
        window.dispatchEvent(new Event(LEARNING_PREFS_EVENT));
        onSaved?.(learner);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      } else {
        cacheLearnerProfile({
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          personalEmail: form.personalEmail.trim() || undefined,
          industryType: form.industryType.trim() || undefined,
          companySize: form.companySize.trim() || undefined,
          email,
          accountType: accountType as LearnerAuthProfile["accountType"],
        });
        window.dispatchEvent(new Event("sft_auth_updated"));
        window.dispatchEvent(new Event(LEARNING_PREFS_EVENT));
        setError(data.message ?? "Saved on this device; database update failed.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
          {isOrganisation ? <Building2 size={16} /> : <UserRound size={16} />}
          {summary}
        </p>
        {email ? <p className="mt-1 text-xs text-gray-400">{email}</p> : null}
        <p className="mt-1 text-[10px] text-zinc-600">
          Your profile and phone are stored in your account — signing in on another PC or phone loads
          the same details from the server.
        </p>
      </div>

      <div className={`grid gap-4 xl:gap-6 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 xl:p-6">
        <h2 className="text-lg font-bold text-white">Personal details</h2>
        <p className="mt-1 text-xs text-gray-400">Update your name and contact information anytime.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={profileLabelClass}>Full name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Your name"
              className={profileFieldClass}
            />
          </label>
          <label className="block">
            <span className={profileLabelClass}>Mobile number</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => patch("phone", e.target.value)}
              placeholder="+27 …"
              className={profileFieldClass}
            />
          </label>
          {isOrganisation ? (
            <label className="block">
              <span className={profileLabelClass}>Personal email</span>
              <input
                type="email"
                value={form.personalEmail}
                onChange={(e) => patch("personalEmail", e.target.value)}
                placeholder="personal@email.com"
                className={profileFieldClass}
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 xl:p-6">
        <h2 className="text-lg font-bold text-white">Work & organisation</h2>
        <p className="mt-1 text-xs text-gray-400">
          {isIndividual
            ? "Tell us where you work so we can recommend the right LMS courses first."
            : "Your organisation details used for team training and recommendations."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={profileLabelClass}>
              {isIndividual ? "Organisation you work for" : "Company name"}
            </span>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => patch("companyName", e.target.value)}
              placeholder={isIndividual ? "e.g. ABC Foods Pvt Ltd" : "Company legal name"}
              className={profileFieldClass}
            />
          </label>
          <label className="block">
            <span className={profileLabelClass}>Industry</span>
            <select
              value={form.industryType}
              onChange={(e) => patch("industryType", e.target.value)}
              className={profileFieldClass}
            >
              <option value="">Select industry</option>
              {PROFILE_INDUSTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {isOrganisation ? (
            <label className="block">
              <span className={profileLabelClass}>Company size</span>
              <select
                value={form.companySize}
                onChange={(e) => patch("companySize", e.target.value)}
                className={profileFieldClass}
              >
                <option value="">Select size</option>
                {PROFILE_COMPANY_SIZE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item} employees
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>
      </div>

      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 md:p-5 xl:p-6">
        <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
          <Sparkles size={18} className="text-violet-300" />
          Learning preferences
        </h2>
        <p className="mt-1 text-xs text-gray-400">Used to rank SF Trainings courses on your dashboard.</p>

        <p className={`${profileLabelClass} mt-4`}>Interests</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEARNING_INTEREST_OPTIONS.map((item) => {
            const active = interests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleInterest(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40"
                    : "border border-white/10 bg-black/30 text-gray-300 hover:border-white/20"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block w-full max-w-xl lg:max-w-2xl">
          <span className={profileLabelClass}>Learning goal</span>
          <select
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setSaved(false);
            }}
            className={profileFieldClass}
          >
            <option value="">Select goal (optional)</option>
            {LEARNING_GOAL_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="text-sm text-amber-200/90">{error}</p> : null}
      {saved ? (
        <p className="text-sm font-semibold text-emerald-300">Profile saved successfully.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save settings"}
        </button>
        {!compact ? (
          <Link
            href="/my-learning?tab=dashboard"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm text-gray-200 hover:bg-white/5"
          >
            Back to My Learning
          </Link>
        ) : null}
      </div>
    </div>
  );
}
