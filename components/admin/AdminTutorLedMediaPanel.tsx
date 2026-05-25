"use client";

import { Upload } from "lucide-react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

const tlField =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  if (!src.trim()) return null;
  return (
    <div className="relative mt-2 aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

type ImageFieldProps = {
  title: string;
  description: string;
  url: string;
  alt: string;
  onUrlChange: (url: string) => void;
  onAltChange?: (alt: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  uploadLabel: string;
  placeholder?: string;
  showAlt?: boolean;
};

function ImageField({
  title,
  description,
  url,
  alt,
  onUrlChange,
  onAltChange,
  onUpload,
  uploading,
  uploadLabel,
  placeholder,
  showAlt = true,
}: ImageFieldProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
      <h4 className="text-xs font-semibold text-white">{title}</h4>
      <p className="mt-0.5 text-[10px] text-gray-500">{description}</p>
      <label className="mt-2 block">
        <span className="text-[10px] text-gray-500">Image URL</span>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={placeholder}
          className={tlField + " font-mono text-[11px]"}
        />
        <ImagePreview src={url} alt={alt || title} />
      </label>
      {showAlt && onAltChange ? (
        <label className="mt-2 block">
          <span className="text-[10px] text-gray-500">Alt text</span>
          <input value={alt} onChange={(e) => onAltChange(e.target.value)} className={tlField} />
        </label>
      ) : null}
      <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/20">
        <Upload className="h-3.5 w-3.5" aria-hidden />
        {uploading ? "Uploading…" : uploadLabel}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onUpload(f);
          }}
        />
      </label>
    </article>
  );
}

type Props = {
  draft: TutorLedProgramStored;
  setDraft: React.Dispatch<React.SetStateAction<TutorLedProgramStored | null>>;
  uploadingHero: boolean;
  uploadingLearnerHero: boolean;
  uploadingTrainerAvatar: boolean;
  onUploadHero: (file: File) => void;
  onUploadLearnerHero: (file: File) => void;
  onUploadTrainerAvatar: (file: File) => void;
};

export function AdminTutorLedMediaPanel({
  draft,
  setDraft,
  uploadingHero,
  uploadingLearnerHero,
  uploadingTrainerAvatar,
  onUploadHero,
  onUploadLearnerHero,
  onUploadTrainerAvatar,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-400">
        Change every course image here — URL or upload. Save program when done.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        <ImageField
          title="Marketing page hero"
          description="Before payment — /tutor-led/your-slug"
          url={draft.heroSrc ?? ""}
          alt={draft.heroAlt ?? ""}
          onUrlChange={(url) => setDraft({ ...draft, heroSrc: url })}
          onAltChange={(alt) => setDraft({ ...draft, heroAlt: alt })}
          onUpload={onUploadHero}
          uploading={uploadingHero}
          uploadLabel="Upload marketing hero"
        />
        <ImageField
          title="Learner dashboard banner"
          description="After payment — My Learning course page"
          url={draft.learnerHeroSrc ?? ""}
          alt={draft.learnerHeroAlt ?? ""}
          onUrlChange={(url) => setDraft({ ...draft, learnerHeroSrc: url })}
          onAltChange={(alt) => setDraft({ ...draft, learnerHeroAlt: alt })}
          onUpload={onUploadLearnerHero}
          uploading={uploadingLearnerHero}
          uploadLabel="Upload learner banner"
          placeholder="Empty = use marketing hero"
        />
        <ImageField
          title="Trainer photo"
          description="Instructor card on marketing & learner pages"
          url={draft.trainer.avatar ?? ""}
          alt={draft.trainer.name}
          onUrlChange={(url) =>
            setDraft({ ...draft, trainer: { ...draft.trainer, avatar: url } })
          }
          onUpload={onUploadTrainerAvatar}
          uploading={uploadingTrainerAvatar}
          uploadLabel="Upload trainer photo"
          showAlt={false}
        />
      </div>
      {(draft.zoomRecordings?.length ?? 0) > 0 ? (
        <p className="text-[10px] text-gray-500">
          Session recording thumbnails use the learner banner unless you set a per-day image under{" "}
          <strong className="text-gray-400">Curriculum & days</strong>.
        </p>
      ) : null}
    </div>
  );
}
