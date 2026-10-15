"use client";

import { useRef, useState } from "react";
import { adminApiErrorMessage, adminMutationHeaders } from "@/lib/admin-csrf-client";
import type { AdminCertificateCourseOption } from "@/components/admin/AdminCourseCertificateApprovals";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#070d1c] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-amber-400/60 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-gray-300";

/** Upload a hand-made certificate PDF for exceptional learners — published instantly, no n8n. */
export default function AdminManualCertificateUpload({
  certificateCourses,
}: {
  certificateCourses: AdminCertificateCourseOption[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [learnerEmail, setLearnerEmail] = useState("");
  const [learnerName, setLearnerName] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    setNotice(null);
    setError(null);
    if (!learnerEmail.trim() || !courseSlug || !file) {
      setError("Enter the learner email, pick the course and choose the PDF.");
      return;
    }
    const courseTitle = certificateCourses.find((c) => c.slug === courseSlug)?.title ?? courseSlug;
    if (
      !window.confirm(
        `Publish "${file.name}" as the certificate for ${learnerEmail.trim()}?\n\nCourse: ${courseTitle}\n\nIt will show on their dashboard immediately. Any existing certificate PDF for this course is replaced.`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("learnerEmail", learnerEmail.trim());
      body.set("courseSlug", courseSlug);
      if (learnerName.trim()) body.set("learnerName", learnerName.trim());

      const headers = adminMutationHeaders();
      headers.delete("Content-Type");
      const res = await fetch("/api/admin/certificates/manual-upload", {
        method: "POST",
        headers,
        credentials: "include",
        body,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(adminApiErrorMessage(data, `Upload failed (${res.status}).`));

      setNotice(data.message ?? "Certificate published.");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-400/25 bg-[#0b1224] p-5">
      <h3 className="text-sm font-semibold text-white">Upload special certificate (manual)</h3>
      <p className="mt-1 text-xs text-gray-400">
        For exceptional learners: make the certificate yourself, upload the PDF here, and it appears on their
        dashboard straight away. n8n is not used for this certificate.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Learner email</label>
          <input
            className={inputClass}
            type="email"
            value={learnerEmail}
            onChange={(e) => setLearnerEmail(e.target.value)}
            placeholder="learner@example.com"
          />
        </div>
        <div>
          <label className={labelClass}>Learner name (optional — updates the name on record)</label>
          <input
            className={inputClass}
            value={learnerName}
            onChange={(e) => setLearnerName(e.target.value)}
            placeholder="Isha Kapur"
          />
        </div>
        <div>
          <label className={labelClass}>Course</label>
          <select className={inputClass} value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)}>
            <option value="">Select course…</option>
            {certificateCourses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Certificate PDF</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-gray-100 hover:file:bg-white/20"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void upload()}
        disabled={busy}
        className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload & publish to dashboard"}
      </button>
    </section>
  );
}
