"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import AdminContentScopeSection from "@/components/admin/AdminContentScopeSection";
import SimpleRichTextArea from "@/components/admin/SimpleRichTextArea";

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
    <div className="md:col-span-2 space-y-5">
      <AdminContentScopeSection
        scope="common"
        title="Shared labels & headings"
        description="Tab names and section titles — often the same across courses (Overview, Reviews, Requirements). Leave blank to use defaults."
      >
        <p className="text-[11px] font-medium text-gray-300">Tab labels</p>
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

        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
          <label className="block">
            <span className="text-[10px] text-gray-500">What you&apos;ll learn — title</span>
            <input
              value={draft.overviewSection?.whatYouLearnTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { whatYouLearnTitle: e.target.value })}
              className={fieldClass}
              placeholder="What you'll learn"
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
            <span className="text-[10px] text-gray-500">FAQ block title</span>
            <input
              value={draft.overviewSection?.faqSectionTitle ?? ""}
              onChange={(e) => patchOverview(setDraft, { faqSectionTitle: e.target.value })}
              className={fieldClass}
              placeholder="Frequently asked questions"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Reviews — learners love title</span>
            <input
              value={draft.reviewsSection?.learnersLoveTitle ?? ""}
              onChange={(e) => patchReviews(setDraft, { learnersLoveTitle: e.target.value })}
              className={fieldClass}
              placeholder="Learners love this course"
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
              placeholder="Ask a question"
            />
          </label>
        </div>

        <p className="mt-5 text-[11px] font-medium text-gray-300">Learning player buttons (after purchase)</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Mark complete</span>
            <input
              value={draft.learningSection?.markCompleteLabel ?? ""}
              onChange={(e) => patchLearning(setDraft, { markCompleteLabel: e.target.value })}
              className={fieldClass}
              placeholder="Mark as Complete"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Previous / Next</span>
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
          <label className="block">
            <span className="text-[10px] text-gray-500">Learning tools — title</span>
            <input
              value={draft.learningSection?.learningToolsTitle ?? ""}
              onChange={(e) => patchLearning(setDraft, { learningToolsTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <p className="md:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-100/90">
            Upload E-Workbook, Transcript, PPT, Podcast, and Additional Resources on the{" "}
            <strong className="text-white">Learning Tools</strong> tab (after Content) — course-wide, not per module.
          </p>
          <label className="block">
            <span className="text-[10px] text-gray-500">Certified badge (on video)</span>
            <input
              value={draft.learningSection?.certifiedBadgeLabel ?? ""}
              onChange={(e) => patchLearning(setDraft, { certifiedBadgeLabel: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Unique page content"
        description="Text and lists that change for each course — outcomes, requirements, review copy, and lesson defaults."
      >
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-[10px] text-gray-500">Learning outcomes (one per line)</span>
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

        <label className="mt-4 block md:col-span-2">
          <span className="mb-1.5 block text-[10px] text-gray-500">
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

        <label className="mt-4 block md:col-span-2">
          <span className="mb-1.5 block text-[10px] text-gray-500">Requirements (one per line)</span>
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

        <label className="mt-4 block md:col-span-2">
          <span className="mb-1.5 block text-[10px] text-gray-500">Highly rated checklist (Reviews tab)</span>
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

        <div className="mt-4">
          <span className="mb-1.5 block text-[10px] text-gray-500">Write review — subtitle</span>
          <SimpleRichTextArea
            value={draft.reviewsSection?.writeReviewSubtitle ?? ""}
            onChange={(v) => patchReviews(setDraft, { writeReviewSubtitle: v })}
            rows={3}
            label="Reviews"
            placeholder="Share your experience with this course…"
          />
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-[10px] text-gray-500">Q&amp;A subtitle</span>
          <SimpleRichTextArea
            value={draft.qaSection?.subtitle ?? ""}
            onChange={(v) => patchQa(setDraft, { subtitle: v })}
            rows={3}
            label="Q&A"
            placeholder="Ask the instructor or other learners…"
          />
        </div>

        <label className="mt-4 block md:col-span-2">
          <span className="mb-1.5 block text-[10px] text-gray-500">Community guidelines (one per line)</span>
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

        <div className="mt-5 border-t border-white/[0.06] pt-5">
          <p className="text-[11px] font-medium text-gray-300">Learning player (this course)</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-[10px] text-gray-500">Brand logo URL</span>
              <input
                value={draft.learningSection?.brandLogoUrl ?? ""}
                onChange={(e) => patchLearning(setDraft, { brandLogoUrl: e.target.value })}
                className={fieldClass}
                placeholder="/SF-WHITE-LOGO.png (same as site header — leave blank to use header logo)"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-gray-500">Accredited label</span>
              <input
                value={draft.learningSection?.accreditedBadgeLabel ?? ""}
                onChange={(e) => patchLearning(setDraft, { accreditedBadgeLabel: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-[10px] text-gray-500">Accredited description</span>
              <SimpleRichTextArea
                value={draft.learningSection?.accreditedDescription ?? ""}
                onChange={(v) => patchLearning(setDraft, { accreditedDescription: v })}
                rows={2}
                label="Accredited"
              />
            </label>
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-[10px] text-gray-500">Certification rule text</span>
              <SimpleRichTextArea
                value={draft.learningSection?.certificationRuleText ?? ""}
                onChange={(v) => patchLearning(setDraft, { certificationRuleText: v })}
                rows={3}
                label="Certificate"
              />
            </div>
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-[10px] text-gray-500">Default lesson about</span>
              <SimpleRichTextArea
                value={draft.learningSection?.defaultLessonAbout ?? ""}
                onChange={(v) => patchLearning(setDraft, { defaultLessonAbout: v })}
                rows={4}
                label="Lesson"
              />
            </div>
            <div className="md:col-span-2">
              <span className="mb-1.5 block text-[10px] text-gray-500">Default lesson description</span>
              <SimpleRichTextArea
                value={draft.learningSection?.defaultLessonDescription ?? ""}
                onChange={(v) => patchLearning(setDraft, { defaultLessonDescription: v })}
                rows={3}
              />
            </div>
            <label className="block md:col-span-2">
              <span className="text-[10px] text-gray-500">No video message</span>
              <input
                value={draft.learningSection?.noVideoMessage ?? ""}
                onChange={(e) => patchLearning(setDraft, { noVideoMessage: e.target.value })}
                className={fieldClass}
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
          </div>
        </div>
      </AdminContentScopeSection>
    </div>
  );
}
