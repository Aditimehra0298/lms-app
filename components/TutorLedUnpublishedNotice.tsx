import Link from "next/link";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

type Props = {
  program: Pick<TutorLedProgramStored, "title" | "slug">;
};

export function TutorLedUnpublishedNotice({ program }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#060b17] px-4 text-center text-white">
      <p className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
        Draft — not published yet
      </p>
      <h1 className="mt-4 text-2xl font-bold">{program.title}</h1>
      <p className="mt-2 max-w-md text-sm text-gray-400">
        This live program is saved as a draft in Admin → Tutor Led. Turn on{" "}
        <strong className="text-gray-200">Published</strong> and click <strong className="text-gray-200">Save program</strong>{" "}
        to make <span className="font-mono text-amber-200/90">/tutor-led/{program.slug}</span> public.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/tutor-led/${encodeURIComponent(program.slug)}?preview=1`}
          className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/30"
        >
          Preview as admin
        </Link>
        <Link href="/courses" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
          Browse courses
        </Link>
      </div>
    </div>
  );
}
