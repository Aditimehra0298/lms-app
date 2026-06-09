"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { CommunityFileUploadZone } from "@/components/CommunityFileUploadZone";
import { getLearnerDisplayName, qaApiHeaders } from "@/lib/course-qa-client";
import { readJsonResponse } from "@/lib/safe-json";

const EXTERNAL_SLUG = "external";

type Props = {
  slugs: string[];
  courseTitles: Record<string, string>;
  onSubmitted?: () => void;
};

export function CommunitySuccessSubmitForm({ slugs, courseTitles, onSubmitted }: Props) {
  const [selectedCourse, setSelectedCourse] = useState(
    slugs.length > 0 ? slugs[0] : EXTERNAL_SLUG,
  );
  const [externalPlatform, setExternalPlatform] = useState("");
  const [story, setStory] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isExternal = selectedCourse === EXTERNAL_SLUG;
  const uploadCourseSlug = isExternal ? undefined : selectedCourse;

  const submit = async () => {
    setMessage(null);
    if (!attachmentUrl) {
      setMessage("Upload your certificate, badge, or completion screenshot.");
      return;
    }
    if (isExternal && !externalPlatform.trim()) {
      setMessage("Enter the platform name (e.g. Coursera, Udemy, LinkedIn Learning).");
      return;
    }
    if (!isExternal && !selectedCourse) {
      setMessage("Select a course.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community/success-submissions", {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({
          courseSlug: isExternal ? EXTERNAL_SLUG : selectedCourse,
          courseTitle: isExternal ? externalPlatform.trim() : (courseTitles[selectedCourse] ?? selectedCourse),
          externalPlatform: isExternal ? externalPlatform.trim() : undefined,
          story: story.trim() || undefined,
          attachmentUrl,
        }),
      });
      const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "Could not submit. Try again.");
        return;
      }
      setStory("");
      setExternalPlatform("");
      setAttachmentUrl("");
      setAttachmentName("");
      setMessage("Submitted! Your proof will appear on the wall after a quick review.");
      onSubmitted?.();
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="rounded-2xl border border-[#FFC107]/25 bg-gradient-to-br from-[#FFC107]/5 via-black/40 to-black p-4">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
        <Trophy className="h-5 w-5 text-[#FFC107]" aria-hidden />
        Submit Your Success
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
        Earned a certificate or badge on another platform? Upload it here so we can celebrate your
        achievement on the success wall.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Related course
          </span>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
          >
            {slugs.map((slug) => (
              <option key={slug} value={slug}>
                {courseTitles[slug] ?? slug}
              </option>
            ))}
            <option value={EXTERNAL_SLUG}>
              {slugs.length > 0 ? "External platform / other site" : "External platform (no enrolled course)"}
            </option>
          </select>
        </label>

        {isExternal ? (
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Platform or provider
            </span>
            <input
              type="text"
              value={externalPlatform}
              onChange={(e) => setExternalPlatform(e.target.value)}
              placeholder="e.g. Coursera, Udemy, LinkedIn Learning"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
          </label>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Your story (optional)
            </span>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={4}
              placeholder="Tell us what you achieved and how it helped your career…"
              className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
            />
          </label>

          <CommunityFileUploadZone
            label="Certificate / badge / screenshot"
            courseSlug={uploadCourseSlug}
            fileUrl={attachmentUrl}
            fileName={attachmentName}
            onUploaded={(url, name) => {
              setAttachmentUrl(url);
              setAttachmentName(name);
            }}
            onClear={() => {
              setAttachmentUrl("");
              setAttachmentName("");
            }}
            disabled={submitting}
          />
        </div>

        {message ? <p className="text-xs text-violet-200">{message}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-500">
            Submitting as {getLearnerDisplayName()}. Submissions are reviewed before going public.
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-lg bg-[#FFC107] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#FFD54F] disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit to Success Wall"}
          </button>
        </div>
      </div>
    </article>
  );
}
