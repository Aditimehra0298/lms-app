import Link from "next/link";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0a0a0a] px-6 py-16 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {COMPANY_DISPLAY_NAME}
      </p>
      <p className="mt-4 font-mono text-6xl font-bold text-zinc-700">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        This link is broken or the page was moved. Check the URL, or continue from one of these
        safe places.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Home
        </Link>
        <Link
          href="/courses"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5"
        >
          Courses
        </Link>
        <Link
          href="/my-learning"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5"
        >
          My learning
        </Link>
        <Link
          href="/account"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5"
        >
          Account
        </Link>
      </div>
    </div>
  );
}
