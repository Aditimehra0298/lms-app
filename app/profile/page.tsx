"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LearnerProfileSettingsEditor } from "@/components/LearnerProfileSettingsEditor";
import { accountTypeLabel } from "@/lib/learner-profile-form";
import { getLearnerEmail, isLearnerLoggedIn, syncLearnerProfileFromServer } from "@/lib/learner-session-client";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import { readJsonResponse } from "@/lib/safe-json";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LmsUserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const email = getLearnerEmail();
    if (!email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const synced = await syncLearnerProfileFromServer(email);
      if (synced?.email) {
        const res = await fetch(`/api/auth/me`, { cache: "no-store", credentials: "include" });
        const data = await readJsonResponse(res, {} as { ok?: boolean; profile?: LmsUserProfilePayload });
        if (data.ok && data.profile) setProfile(data.profile);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const signedIn = isLearnerLoggedIn();
    setLoggedIn(signedIn);
    if (signedIn) void loadProfile();
    else setLoading(false);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto w-full max-w-[1760px] px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Profile & settings</h1>
          <p className="mt-6 text-gray-300">Loading…</p>
        </main>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto w-full max-w-[1760px] px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Profile & settings</h1>
          <p className="mt-3 text-gray-300">
            <Link href="/account?mode=login&redirect=/profile" className="text-amber-300 hover:underline">
              Sign in
            </Link>{" "}
            to view and edit your profile.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto w-full max-w-[1760px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/40 bg-[#121212]">
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name ?? "Profile"}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-200">
                {(profile?.name?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Profile & settings</h1>
            <p className="mt-1 text-sm text-gray-400">
              {profile
                ? `${accountTypeLabel(profile.accountType)} · edit your details and learning preferences`
                : "Edit your details and learning preferences"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-gray-300">Loading profile…</p>
        ) : !profile ? (
          <p className="mt-8 text-gray-300">
            Profile not found. Try{" "}
            <button type="button" onClick={() => void loadProfile()} className="text-amber-300 underline">
              reload
            </button>
            .
          </p>
        ) : (
          <div className="mt-8 w-full">
            <LearnerProfileSettingsEditor initialProfile={profile} onSaved={() => void loadProfile()} />
          </div>
        )}

        {profile?.role === "admin" ? (
          <Link
            href="/admin"
            className="mt-8 inline-block rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3 font-bold text-black"
          >
            Open admin panel
          </Link>
        ) : null}
      </main>
    </div>
  );
}
