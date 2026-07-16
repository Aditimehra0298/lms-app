"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedCourse, ManagedCourseHeroSection } from "@/lib/content-schema";
import {
  COURSE_CAPTION_PRESETS,
  COURSE_PAGE_LANGUAGES,
  HERO_UPDATE_MONTHS,
  formatHeroLastUpdated,
  heroYearOptions,
  parseHeroLastUpdated,
} from "@/lib/course-hero-form-options";
import {
  heroBackgroundImageHint,
  heroCertificatePreviewImageHint,
  heroPreviewImageHint,
} from "@/lib/admin-image-hints";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import SimpleRichTextArea from "@/components/admin/SimpleRichTextArea";

const spField =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/40";

const spSelect = spField + " cursor-pointer";

function updateHero(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Partial<ManagedCourseHeroSection>,
) {
  setDraft((d) => ({
    ...d,
    hero: { ...(d.hero ?? {}), ...patch },
  }));
}

type HeroUploadField = "backgroundImage" | "previewImage" | "certificatePreviewImage";

type Props = {
  draft: ManagedCourse;
  setDraft: Dispatch<SetStateAction<ManagedCourse>>;
  onUploadHeroImage: (field: HeroUploadField, file: File) => Promise<void>;
  uploadingHeroField: HeroUploadField | null;
  fieldClass?: string;
};

function Field({
  label,
  hint,
  children,
  asLabel = true,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  /** Use false when children include multiple inputs (e.g. Month + Year). */
  asLabel?: boolean;
}) {
  const Wrapper = asLabel ? "label" : "div";
  return (
    <Wrapper className="block">
      <span className="text-[10px] font-medium text-gray-500">{label}</span>
      {children}
      {hint ? <p className="mt-0.5 text-[9px] leading-snug text-gray-600">{hint}</p> : null}
    </Wrapper>
  );
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-white/[0.08] bg-black/20 open:border-violet-500/25"
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-violet-200 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-gray-500 transition group-open:rotate-90">▸</span>
          {title}
        </span>
      </summary>
      <div className="space-y-3 border-t border-white/[0.06] px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

export default function AdminCourseHeroFieldsEditor({
  draft,
  setDraft,
  onUploadHeroImage,
  uploadingHeroField,
  fieldClass = spField,
}: Props) {
  const hero = draft.hero ?? {};
  const { month: luMonth, year: luYear } = parseHeroLastUpdated(hero.lastUpdated ?? "");
  const years = heroYearOptions();
  const langSelectValue = !hero.language?.trim()
    ? ""
    : (COURSE_PAGE_LANGUAGES as readonly string[]).includes(hero.language)
      ? hero.language
      : "__other__";
  const captionSelectValue = !hero.captions?.trim()
    ? ""
    : (COURSE_CAPTION_PRESETS as readonly string[]).includes(hero.captions)
      ? hero.captions
      : "__custom__";

  const selectClass = fieldClass === spField ? spSelect : fieldClass;

  return (
    <div className="space-y-3">
      <Section title="Trust & stats (top of hero)" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Rating count" hint="e.g. 1,245 → (1,245 ratings)">
            <input
              value={hero.ratingCount ?? ""}
              onChange={(e) => updateHero(setDraft, { ratingCount: e.target.value })}
              className={fieldClass}
              placeholder="1,245"
              inputMode="numeric"
            />
          </Field>
          <Field label="Students enrolled">
            <input
              value={hero.studentsLabel ?? ""}
              onChange={(e) => updateHero(setDraft, { studentsLabel: e.target.value })}
              className={fieldClass}
              placeholder="23,455 students enrolled"
            />
          </Field>
          <Field label="Last updated" asLabel={false}>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select
                aria-label="Last updated month"
                value={luMonth}
                onChange={(e) =>
                  updateHero(setDraft, {
                    lastUpdated: formatHeroLastUpdated(e.target.value, luYear),
                  })
                }
                className={selectClass}
              >
                <option value="">Month</option>
                {HERO_UPDATE_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Last updated year"
                value={luYear}
                onChange={(e) =>
                  updateHero(setDraft, {
                    lastUpdated: formatHeroLastUpdated(luMonth, e.target.value),
                  })
                }
                className={selectClass}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Course language">
            <select
              value={langSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__other__") {
                  updateHero(setDraft, { language: "" });
                  return;
                }
                updateHero(setDraft, { language: v });
              }}
              className={selectClass}
            >
              <option value="">Select language</option>
              {COURSE_PAGE_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
              <option value="__other__">Other (type below)</option>
            </select>
            {langSelectValue === "__other__" ? (
              <input
                value={hero.language ?? ""}
                onChange={(e) => updateHero(setDraft, { language: e.target.value })}
                className={fieldClass + " mt-1.5"}
                placeholder="Custom language name"
              />
            ) : null}
          </Field>
          <Field label="Captions / subtitles" hint="Shown on course page">
            <select
              value={captionSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom__") {
                  updateHero(setDraft, { captions: "" });
                  return;
                }
                updateHero(setDraft, { captions: v === "None" ? "" : v });
              }}
              className={selectClass}
            >
              <option value="">Select</option>
              {COURSE_CAPTION_PRESETS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">Custom text</option>
            </select>
            {captionSelectValue === "__custom__" ? (
              <input
                value={hero.captions ?? ""}
                onChange={(e) => updateHero(setDraft, { captions: e.target.value })}
                className={fieldClass + " mt-1.5"}
                placeholder="e.g. English, Hindi [CC]"
              />
            ) : null}
          </Field>
        </div>
      </Section>

      <Section title="Images">
        <div className="space-y-3">
          <AdminImageUrlUpload
            label="Hero background"
            value={hero.backgroundImage ?? ""}
            onChange={(url) => updateHero(setDraft, { backgroundImage: url })}
            onUploadFile={(f) => onUploadHeroImage("backgroundImage", f)}
            uploading={uploadingHeroField === "backgroundImage"}
            placeholder="Optional — uses cover image if empty"
            hint={heroBackgroundImageHint}
            obscureValue
            className="block"
          />
          <AdminImageUrlUpload
            label="Enroll card preview"
            value={hero.previewImage ?? ""}
            onChange={(url) => updateHero(setDraft, { previewImage: url })}
            onUploadFile={(f) => onUploadHeroImage("previewImage", f)}
            uploading={uploadingHeroField === "previewImage"}
            placeholder="/p2.png"
            hint={heroPreviewImageHint}
            obscureValue
            className="block"
          />
          <AdminImageUrlUpload
            label="Certificate preview (sidebar)"
            value={hero.certificatePreviewImage ?? ""}
            onChange={(url) => updateHero(setDraft, { certificatePreviewImage: url })}
            onUploadFile={(f) => onUploadHeroImage("certificatePreviewImage", f)}
            uploading={uploadingHeroField === "certificatePreviewImage"}
            placeholder="/certificates/…"
            hint={heroCertificatePreviewImageHint}
            obscureValue
            className="block"
          />
        </div>
      </Section>

      <Section title="Enroll card labels">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Preview label">
            <input
              value={hero.previewLabel ?? ""}
              onChange={(e) => updateHero(setDraft, { previewLabel: e.target.value })}
              className={fieldClass}
              placeholder="Preview this course"
            />
          </Field>
          <Field label="Money-back line">
            <input
              value={hero.moneyBackGuarantee ?? ""}
              onChange={(e) => updateHero(setDraft, { moneyBackGuarantee: e.target.value })}
              className={fieldClass}
              placeholder="7 days money-back guarantee"
            />
          </Field>
          <Field label="Enroll button">
            <input
              value={hero.enrollButtonLabel ?? ""}
              onChange={(e) => updateHero(setDraft, { enrollButtonLabel: e.target.value })}
              className={fieldClass}
              placeholder="Enroll Now"
            />
          </Field>
          <Field label="Wishlist button">
            <input
              value={hero.wishlistButtonLabel ?? ""}
              onChange={(e) => updateHero(setDraft, { wishlistButtonLabel: e.target.value })}
              className={fieldClass}
              placeholder="Add to Wishlist"
            />
          </Field>
        </div>
      </Section>

      <Section title="Stats bar (chips under hero)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Lectures">
            <input
              value={hero.lectureCount ?? ""}
              onChange={(e) => updateHero(setDraft, { lectureCount: e.target.value })}
              className={fieldClass}
              placeholder="85 Lectures"
            />
          </Field>
          <Field label="Projects">
            <input
              value={hero.projects ?? ""}
              onChange={(e) => updateHero(setDraft, { projects: e.target.value })}
              className={fieldClass}
              placeholder="5 Hands-on"
            />
          </Field>
          <Field label="Certificate">
            <input
              value={hero.certificate ?? ""}
              onChange={(e) => updateHero(setDraft, { certificate: e.target.value })}
              className={fieldClass}
              placeholder="Yes"
            />
          </Field>
          <Field label="Access">
            <input
              value={hero.access ?? ""}
              onChange={(e) => updateHero(setDraft, { access: e.target.value })}
              className={fieldClass}
              placeholder="Lifetime"
            />
          </Field>
          <Field label="Shareable">
            <input
              value={hero.shareable ?? ""}
              onChange={(e) => updateHero(setDraft, { shareable: e.target.value })}
              className={fieldClass}
              placeholder="Yes"
            />
          </Field>
        </div>
      </Section>

      <Section title="About & sidebar includes">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-[10px] text-gray-500">About this course</span>
            <SimpleRichTextArea
              value={hero.aboutText ?? ""}
              onChange={(v) => updateHero(setDraft, { aboutText: v })}
              rows={4}
              label="About"
              placeholder="Overview paragraph…"
            />
          </div>
          <Field label="This course includes" hint="One line per item (sidebar list)">
            <textarea
              value={(hero.courseIncludes ?? []).join("\n")}
              onChange={(e) =>
                updateHero(setDraft, {
                  courseIncludes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              className={fieldClass + " resize-y text-[12px]"}
              placeholder={"12 hours on-demand video\n85 downloadable resources"}
            />
          </Field>
          <Field label="Certificate label">
            <input
              value={hero.certificatePreviewLabel ?? ""}
              onChange={(e) => updateHero(setDraft, { certificatePreviewLabel: e.target.value })}
              className={fieldClass}
              placeholder="Certificate of Attainment"
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
