"use client";

import { useMemo, useState } from "react";
import { Award, Loader2, Sparkles } from "lucide-react";
import type { AdminCertificateCourseOption } from "@/components/admin/AdminCourseCertificateApprovals";

type Props = {
  courses: AdminCertificateCourseOption[];
  onIssued?: () => void;
};

export default function AdminCertificateIssuePanel({ courses, onIssued }: Props) {
  const [email, setEmail] = useState("");
  const [learnerName, setLearnerName] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [scorePercent, setScorePercent] = useState("");
  const [makeVisible, setMakeVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses],
  );

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/certificates/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerEmail: email.trim(),
          learnerName: learnerName.trim() || undefined,
          courseSlug,
          scorePercent: scorePercent.trim() ? Number(scorePercent) : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        certificate?: { id: string };
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not issue certificate");

      if (makeVisible && data.certificate?.id) {
        await fetch(`/api/admin/certificates/${encodeURIComponent(data.certificate.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visibleToLearner: true, allowDownload: true }),
        });
      } else if (!makeVisible && data.certificate?.id) {
        await fetch(`/api/admin/certificates/${encodeURIComponent(data.certificate.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visibleToLearner: false, allowDownload: false }),
        });
      }

      setNotice(
        makeVisible
          ? "Certificate issued and visible to the learner."
          : "Certificate issued. Learner cannot see it until you allow access.",
      );
      setEmail("");
      setLearnerName("");
      setScorePercent("");
      onIssued?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue certificate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.12] via-[#0c1428] to-[#070b14] p-4 sm:p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/35">
          <Sparkles className="h-5 w-5 text-amber-200" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Issue certificate to a learner</h2>
          <p className="mt-1 max-w-2xl text-xs text-gray-400">
            Choose who receives a certificate for which program. You control whether they can see and download it.
          </p>
        </div>
      </div>

      {notice ? (
        <p className="relative mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="relative mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="relative mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block text-xs text-gray-400">
          Learner email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="learner@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
          />
        </label>
        <label className="block text-xs text-gray-400">
          Name on certificate (optional)
          <input
            value={learnerName}
            onChange={(e) => setLearnerName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
          />
        </label>
        <label className="block text-xs text-gray-400 md:col-span-2 xl:col-span-1">
          Program / course
          <select
            value={courseSlug}
            onChange={(e) => setCourseSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
          >
            <option value="">Select program…</option>
            {sorted.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-gray-400">
          Score % (optional)
          <input
            type="number"
            min={0}
            max={100}
            value={scorePercent}
            onChange={(e) => setScorePercent(e.target.value)}
            placeholder="e.g. 85"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
          />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-[11px] text-gray-300">
            <input
              type="checkbox"
              checked={makeVisible}
              onChange={(e) => setMakeVisible(e.target.checked)}
              className="rounded border-white/20"
            />
            Show to learner now
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !email.trim() || !courseSlug}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-amber-300 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            Issue certificate
          </button>
        </div>
      </div>
    </section>
  );
}
