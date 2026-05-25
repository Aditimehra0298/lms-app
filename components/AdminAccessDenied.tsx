"use client";

import Link from "next/link";

type Props = {
  mainAdminMasked?: string;
  userEmail?: string | null;
  message?: string;
};

export default function AdminAccessDenied({
  mainAdminMasked,
  userEmail,
  message,
}: Props) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="max-w-md rounded-2xl border border-amber-500/30 bg-black/50 p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin access</p>
        <h1 className="mt-2 text-xl font-bold text-white">Permission required</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          {message ??
            "Only the main administrator account can open this panel. Ask the owner for permission."}
        </p>
        {mainAdminMasked ? (
          <p className="mt-4 text-sm text-amber-100/90">
            Main account: <strong className="text-amber-50">{mainAdminMasked}</strong>
          </p>
        ) : null}
        {userEmail ? (
          <p className="mt-2 text-xs text-zinc-500">
            Signed in as: {userEmail}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/account?admin=1"
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400"
          >
            Sign in with main Google account
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
          >
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
