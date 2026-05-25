"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LmsUserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const signedIn = isLearnerLoggedIn();
    setLoggedIn(signedIn);

    if (!signedIn) {
      setLoading(false);
      return;
    }

    const email = getLearnerEmail();
    if (!email) {
      setLoading(false);
      return;
    }

    void fetch(`/api/auth/me?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { ok?: boolean; profile?: LmsUserProfilePayload }) => {
        if (data.ok && data.profile) setProfile(data.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-6 py-12 xl:px-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="mt-8 text-gray-300">Loading…</p>
        </main>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-[1760px] px-6 py-12 xl:px-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="mt-3 text-gray-300">
            <Link href="/account?mode=login" className="text-amber-300 hover:underline">
              Sign in
            </Link>{" "}
            to view your profile.
          </p>
        </main>
      </div>
    );
  }

  const display = profile;
  const rows: { label: string; value: string | null | undefined }[] = display
    ? [
        { label: "Email", value: display.email },
        { label: "Name", value: display.name },
        { label: "Account type", value: display.accountType },
        { label: "Role", value: display.role },
        { label: "Phone", value: display.phone },
        { label: "Company", value: display.companyName },
        { label: "Personal email", value: display.personalEmail },
        { label: "Industry", value: display.industryType },
        { label: "Company size", value: display.companySize },
        { label: "Country", value: display.countryName ?? display.countryCode },
        {
          label: "Last login",
          value: display.lastLoginAt
            ? new Date(display.lastLoginAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : null,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-6 py-12 xl:px-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 text-sm text-gray-400">Saved in your LMS database</p>

        {loading ? (
          <p className="mt-8 text-gray-300">Loading profile…</p>
        ) : !display ? (
          <p className="mt-8 text-gray-300">Profile not found in database.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="flex h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/40 bg-[#121212]">
              {display.avatarUrl ? (
                <Image
                  src={display.avatarUrl}
                  alt={display.name ?? "Profile"}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-amber-200">
                  {(display.name?.[0] ?? display.email[0] ?? "U").toUpperCase()}
                </span>
              )}
            </div>
            <dl className="grid flex-1 gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <dt className="text-xs uppercase tracking-wide text-amber-200/70">{row.label}</dt>
                  <dd className="mt-1 text-sm text-gray-100">{row.value?.trim() || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {display?.role === "admin" && (
          <Link
            href="/admin"
            className="mt-8 inline-block rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-6 py-3 font-bold text-black"
          >
            Open admin panel
          </Link>
        )}
      </main>
    </div>
  );
}
