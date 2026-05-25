"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedCourse } from "@/lib/content-schema";

type Props = {
  draft: ManagedCourse;
  setDraft: Dispatch<SetStateAction<ManagedCourse>>;
  fieldClass: string;
  textareaClass: string;
};

function patchOverview(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Record<string, unknown>,
) {
  setDraft((d) => ({ ...d, overviewSection: { ...(d.overviewSection ?? {}), ...patch } }));
}

function patchLearning(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Record<string, unknown>,
) {
  setDraft((d) => ({ ...d, learningSection: { ...(d.learningSection ?? {}), ...patch } }));
}

function patchReviews(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Record<string, unknown>,
) {
  setDraft((d) => ({ ...d, reviewsSection: { ...(d.reviewsSection ?? {}), ...patch } }));
}

function patchQa(setDraft: Dispatch<SetStateAction<ManagedCourse>>, patch: Record<string, unknown>) {
  setDraft((d) => ({ ...d, qaSection: { ...(d.qaSection ?? {}), ...patch } }));
}

function patchTabs(setDraft: Dispatch<SetStateAction<ManagedCourse>>, patch: Record<string, unknown>) {
  setDraft((d) => ({ ...d, tabLabels: { ...(d.tabLabels ?? {}), ...patch } }));
}

export default function AdminSelfPacedPageContentEditor({
  draft,
  setDraft,
  fieldClass,
  textareaClass,
}: Props) {
  const whatYouLearnText = (draft.overviewSection?.whatYouLearn ?? [])
    .map((w) => `${w.title} | ${w.description}`)
    .join("\n");

  return (
    <>
      <div className="md:col-span-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-4">
        <h3 className="text-sm font-semibold text-sky-100">Before payment — public landing page</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          Shown at <code className="rounded bg-black/40 px-1 font-mono text-[10px]">/courses/[slug]</code>{" "}
          (Overview, Reviews, Q&amp;A tabs). Hero and Instructor blocks are above. Leave blank for smart
          defaults.
        </p>

        <p className="mt-4 text-[11px] font-medium text-gray-300">Tab labels</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          {(
            [
              ["overview", "Overview"],
              ["curriculum", "Course Content"],
              ["instructor", "Instructor"],
              ["reviews", "Reviews"],
              ["qa", "Q&A"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[10px] text-gray-500">{label}</span>
              <input
                value={draft.tabLabels?.[key] ?? ""}
                onChange={(e) => patchTabs(setDraft, { [key]: e.target.value })}
                className={fieldClass}
                placeholder={label}
              />
            </label>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium text-gray-300">Overview tab</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">About section title</span>
            <input
              value={draft.overviewSection?.aboutTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { aboutTitle: e.target.value })}
              className={fieldClass}
              placeholder="About this course"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">You will learn — heading</span>
            <input
              value={draft.overviewSection?.youWillLearnTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { youWillLearnTitle: e.target.value })}
              className={fieldClass}
              placeholder="You will learn to:"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Learning outcomes (one per line)</span>
            <textarea
              value={(draft.overviewSection?.learnOutcomes ?? []).join("\n")}
              onChange={(e) =>
                patchOverview(setDraft, {
                  learnOutcomes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={5}
              className={textareaClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">What you&apos;ll learn — title</span>
            <input
              value={draft.overviewSection?.whatYouLearnTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { whatYouLearnTitle: e.target.value })}
              className={fieldClass}
              placeholder="What you'll learn"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">
              What you&apos;ll learn grid — one per line: Title | Description
            </span>
            <textarea
              value={whatYouLearnText}
              onChange={(e) =>
                patchOverview(setDraft, {
                  whatYouLearn: e.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const [title, ...rest] = line.split("|");
                      return {
                        title: (title ?? "").trim(),
                        description: rest.join("|").trim(),
                      };
                    })
                    .filter((w) => w.title),
                })
              }
              rows={6}
              className={textareaClass}
              placeholder="Threat Detection | Identify and analyze breaches…"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Requirements — title</span>
            <input
              value={draft.overviewSection?.requirementsTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { requirementsTitle: e.target.value })}
              className={fieldClass}
              placeholder="Requirements"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Requirements (one per line)</span>
            <textarea
              value={(draft.overviewSection?.requirements ?? []).join("\n")}
              onChange={(e) =>
                patchOverview(setDraft, {
                  requirements: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={4}
              className={textareaClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">FAQ section title</span>
            <input
              value={draft.overviewSection?.faqSectionTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { faqSectionTitle: e.target.value })}
              className={fieldClass}
              placeholder="Frequently asked questions"
            />
          </label>
        </div>

        <p className="mt-4 text-[11px] font-medium text-gray-300">Reviews tab (copy)</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Learners love — title</span>
            <input
              value={draft.reviewsSection?.learnersLoveTitle ?? ""}
              onChange={(e) => patchReviews(setDraft, { learnersLoveTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Highly rated checklist (one per line)</span>
            <textarea
              value={(draft.reviewsSection?.highlyRatedItems ?? []).join("\n")}
              onChange={(e) =>
                patchReviews(setDraft, {
                  highlyRatedItems: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={4}
              className={textareaClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Write review — title</span>
            <input
              value={draft.reviewsSection?.writeReviewTitle ?? ""}
              onChange={(e) => patchReviews(setDraft, { writeReviewTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Write review — subtitle</span>
            <input
              value={draft.reviewsSection?.writeReviewSubtitle ?? ""}
              onChange={(e) => patchReviews(setDraft, { writeReviewSubtitle: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>

        <p className="mt-4 text-[11px] font-medium text-gray-300">Q&amp;A tab (copy)</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Q&amp;A title</span>
            <input
              value={draft.qaSection?.title ?? ""}
              onChange={(e) => patchQa(setDraft, { title: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Ask button label</span>
            <input
              value={draft.qaSection?.askButtonLabel ?? ""}
              onChange={(e) => patchQa(setDraft, { askButtonLabel: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Q&amp;A subtitle</span>
            <textarea
              value={draft.qaSection?.subtitle ?? ""}
              onChange={(e) => patchQa(setDraft, { subtitle: e.target.value })}
              rows={2}
              className={textareaClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Community guidelines (one per line)</span>
            <textarea
              value={(draft.qaSection?.guidelines ?? []).join("\n")}
              onChange={(e) =>
                patchQa(setDraft, {
                  guidelines: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={5}
              className={textareaClass}
            />
          </label>
        </div>
      </div>

      <div className="md:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
        <h3 className="text-sm font-semibold text-emerald-100">After payment — learning player</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          Shown at <code className="rounded bg-black/40 px-1 font-mono text-[10px]">/my-learning/course/[slug]</code>{" "}
          when the learner starts the course. Curriculum videos are edited under Core Section.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Brand logo URL (video watermark &amp; sidebar)</span>
            <input
              value={draft.learningSection?.brandLogoUrl ?? ""}
              onChange={(e) => patchLearning(setDraft, { brandLogoUrl: e.target.value })}
              className={fieldClass}
              placeholder="/SF-WHITE-LOGO.png — upload to public/ or use admin upload"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Certified badge (on video)</span>
            <input
              value={draft.learningSection?.certifiedBadgeLabel ?? ""}
              onChange={(e) => patchLearning(setDraft, { certifiedBadgeLabel: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Accredited label (sidebar logo card)</span>
            <input
              value={draft.learningSection?.accreditedBadgeLabel ?? ""}
              onChange={(e) => patchLearning(setDraft, { accreditedBadgeLabel: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Accredited description (under logo)</span>
            <input
              value={draft.learningSection?.accreditedDescription ?? ""}
              onChange={(e) => patchLearning(setDraft, { accreditedDescription: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Certification rule text (modules panel)</span>
            <textarea
              value={draft.learningSection?.certificationRuleText ?? ""}
              onChange={(e) => patchLearning(setDraft, { certificationRuleText: e.target.value })}
              rows={2}
              className={textareaClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">No video message</span>
            <input
              value={draft.learningSection?.noVideoMessage ?? ""}
              onChange={(e) => patchLearning(setDraft, { noVideoMessage: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Learning tools — title</span>
            <input
              value={draft.learningSection?.learningToolsTitle ?? ""}
              onChange={(e) => patchLearning(setDraft, { learningToolsTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Learning tools — hint</span>
            <input
              value={draft.learningSection?.learningToolsHint ?? ""}
              onChange={(e) => patchLearning(setDraft, { learningToolsHint: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Default lesson about (when admin lesson empty)</span>
            <textarea
              value={draft.learningSection?.defaultLessonAbout ?? ""}
              onChange={(e) => patchLearning(setDraft, { defaultLessonAbout: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Default lesson description</span>
            <textarea
              value={draft.learningSection?.defaultLessonDescription ?? ""}
              onChange={(e) => patchLearning(setDraft, { defaultLessonDescription: e.target.value })}
              rows={2}
              className={textareaClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Default learning outcomes (one per line)</span>
            <textarea
              value={(draft.learningSection?.defaultLearningOutcomes ?? []).join("\n")}
              onChange={(e) =>
                patchLearning(setDraft, {
                  defaultLearningOutcomes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={5}
              className={textareaClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Mark complete / Previous / Next</span>
            <input
              value={draft.learningSection?.markCompleteLabel ?? ""}
              onChange={(e) => patchLearning(setDraft, { markCompleteLabel: e.target.value })}
              className={fieldClass}
              placeholder="Mark as Complete"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">&nbsp;</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={draft.learningSection?.previousLabel ?? ""}
                onChange={(e) => patchLearning(setDraft, { previousLabel: e.target.value })}
                className={fieldClass}
                placeholder="Previous"
              />
              <input
                value={draft.learningSection?.nextLabel ?? ""}
                onChange={(e) => patchLearning(setDraft, { nextLabel: e.target.value })}
                className={fieldClass}
                placeholder="Next"
              />
            </div>
          </label>
        </div>
      </div>
    </>
  );
}
