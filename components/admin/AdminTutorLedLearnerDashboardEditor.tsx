"use client";

import Link from "next/link";
import { ExternalLink, LayoutDashboard, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import AdminContentScopeSection from "@/components/admin/AdminContentScopeSection";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TUTOR_LED_ICON_NAMES } from "@/lib/tutor-led-program-map";
import {
  newLearnerAchievement,
  newLearnerForumPost,
  newLearnerQuickLink,
  newLearnerResourceTile,
  type TutorLedLearnerResourceTileType,
  type TutorLedLearnerSection,
} from "@/lib/tutor-led-learner-section";

type Props = {
  draft: TutorLedProgramStored;
  setDraft: Dispatch<SetStateAction<TutorLedProgramStored | null>>;
  fieldClass: string;
};

function patchLearner(
  setDraft: Dispatch<SetStateAction<TutorLedProgramStored | null>>,
  patch: Partial<TutorLedLearnerSection>,
) {
  setDraft((d) =>
    d ? { ...d, learnerSection: { ...(d.learnerSection ?? {}), ...patch } } : d,
  );
}

const RESOURCE_TYPES: { id: TutorLedLearnerResourceTileType; label: string }[] = [
  { id: "pdf", label: "PDF notes (from pad-notes)" },
  { id: "slides", label: "Slides (from PPT)" },
  { id: "workbook", label: "Workbook (from webbook)" },
  { id: "podcast", label: "Podcast" },
  { id: "links", label: "External links" },
];

export function AdminTutorLedLearnerDashboardEditor({ draft, setDraft, fieldClass }: Props) {
  const ls = draft.learnerSection ?? {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#FFC107]/25 bg-gradient-to-r from-[#FFC107]/10 to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/15">
            <LayoutDashboard className="h-5 w-5 text-[#FFC107]" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Learner dashboard</h3>
            <p className="mt-0.5 max-w-lg text-[11px] text-gray-400">
              Gold &amp; green enrolled hub at{" "}
              <span className="font-mono text-gray-300">/my-learning/course/{draft.slug || "…"}</span> — section
              titles, exam settings, forum, achievements, and footer actions.
            </p>
          </div>
        </div>
        <Link
          href={`/my-learning/course/${draft.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/10 px-3 py-2 text-[11px] font-semibold text-[#FFC107] hover:bg-[#FFC107]/20"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Preview hub
        </Link>
      </div>

      <AdminContentScopeSection
        scope="course"
        title="Hero & progress"
        description="Enrolled badge, checklist labels, and exam call-to-action copy."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Enrolled badge</span>
            <input
              value={ls.enrolledBadgeLabel ?? ""}
              onChange={(e) => patchLearner(setDraft, { enrolledBadgeLabel: e.target.value })}
              className={fieldClass}
              placeholder="Enrolled"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Next session prefix</span>
            <input
              value={ls.nextSessionPrefix ?? ""}
              onChange={(e) => patchLearner(setDraft, { nextSessionPrefix: e.target.value })}
              className={fieldClass}
              placeholder="Next live session:"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[10px] text-gray-500">Checklist items (one per line)</span>
          <textarea
            value={(ls.checklistItems ?? []).join("\n")}
            onChange={(e) =>
              patchLearner(setDraft, {
                checklistItems: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={4}
            className={`${fieldClass} font-mono text-[11px]`}
            placeholder={"All sessions attended\nLearning materials completed\n…"}
          />
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Exam unlocked title</span>
            <input
              value={ls.examEligibleTitle ?? ""}
              onChange={(e) => patchLearner(setDraft, { examEligibleTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Exam locked title</span>
            <input
              value={ls.examLockedTitle ?? ""}
              onChange={(e) => patchLearner(setDraft, { examLockedTitle: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-gray-500">Exam locked hint</span>
            <input
              value={ls.examLockedHint ?? ""}
              onChange={(e) => patchLearner(setDraft, { examLockedHint: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Start exam button</span>
            <input
              value={ls.startExamLabel ?? ""}
              onChange={(e) => patchLearner(setDraft, { startExamLabel: e.target.value })}
              className={fieldClass}
              placeholder="Start final exam"
            />
          </label>
        </div>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Section titles"
        description="Headings shown across the enrolled dashboard cards."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["learningJourneyTitle", "Learning journey"],
              ["courseProgressTitle", "Course progress"],
              ["upcomingSessionTitle", "Upcoming session (sidebar)"],
              ["certificateCenterTitle", "Certificate center"],
              ["liveClassroomTitle", "Live classroom"],
              ["quickLinksTitle", "Quick links"],
              ["recordingsTitle", "Session recordings"],
              ["forumTitle", "Discussion forum"],
              ["resourcesTitle", "Learning resources"],
              ["finalExamTitle", "Final exam"],
              ["feedbackTitle", "Feedback & reviews"],
              ["continueLearningTitle", "Continue learning"],
              ["achievementsTitle", "Achievements"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[10px] text-gray-500">{label}</span>
              <input
                value={ls[key] ?? ""}
                onChange={(e) => patchLearner(setDraft, { [key]: e.target.value })}
                className={fieldClass}
                placeholder={label}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-gray-300">
          <input
            type="checkbox"
            checked={ls.showLiveNowBadge ?? true}
            onChange={(e) => patchLearner(setDraft, { showLiveNowBadge: e.target.checked })}
            className="accent-[#FFC107]"
          />
          Show &quot;Live now&quot; badge on classroom card
        </label>
        <label className="block">
          <span className="text-[10px] text-gray-500">Upcoming session badge (sidebar)</span>
          <input
            value={ls.upcomingSessionBadge ?? ""}
            onChange={(e) => patchLearner(setDraft, { upcomingSessionBadge: e.target.value })}
            className={fieldClass}
            placeholder="Today"
          />
        </label>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Final exam & reviews"
        description="Assessment stats and review summary on the learner hub."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[10px] text-gray-500">Questions</span>
            <input
              type="number"
              min={1}
              value={ls.examQuestions ?? ""}
              onChange={(e) =>
                patchLearner(setDraft, { examQuestions: parseInt(e.target.value, 10) || undefined })
              }
              className={fieldClass}
              placeholder="50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Minutes</span>
            <input
              type="number"
              min={1}
              value={ls.examMinutes ?? ""}
              onChange={(e) =>
                patchLearner(setDraft, { examMinutes: parseInt(e.target.value, 10) || undefined })
              }
              className={fieldClass}
              placeholder="60"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Passing score (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={ls.examPassingScore ?? ""}
              onChange={(e) =>
                patchLearner(setDraft, { examPassingScore: parseInt(e.target.value, 10) || undefined })
              }
              className={fieldClass}
              placeholder="70"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[10px] text-gray-500">Final exam description</span>
          <input
            value={ls.finalExamDescription ?? ""}
            onChange={(e) => patchLearner(setDraft, { finalExamDescription: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[10px] text-gray-500">Final exam CSV URL</span>
          <input
            value={ls.examUploadUrl ?? ""}
            onChange={(e) => patchLearner(setDraft, { examUploadUrl: e.target.value })}
            className={fieldClass}
            placeholder="/uploads/admin/your-exam.csv"
          />
          <p className="mt-1 text-[10px] text-gray-500">
            Upload via Admin media, then paste the URL — unlocks on Assignments after all training days.
          </p>
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Review rating</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={ls.reviewRating ?? ""}
              onChange={(e) =>
                patchLearner(setDraft, { reviewRating: parseFloat(e.target.value) || undefined })
              }
              className={fieldClass}
              placeholder="4.9"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Review count</span>
            <input
              type="number"
              min={0}
              value={ls.reviewCount ?? ""}
              onChange={(e) =>
                patchLearner(setDraft, { reviewCount: parseInt(e.target.value, 10) || undefined })
              }
              className={fieldClass}
              placeholder="125"
            />
          </label>
        </div>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Discussion forum"
        description="Pinned threads shown on the learner hub (link goes to community tab)."
      >
        <ul className="space-y-2">
          {(ls.forumPosts ?? []).map((post, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_80px_auto]">
              <input
                value={post.title}
                onChange={(e) => {
                  const next = [...(ls.forumPosts ?? [])];
                  next[i] = { ...next[i], title: e.target.value };
                  patchLearner(setDraft, { forumPosts: next });
                }}
                className={fieldClass}
                placeholder="Thread title"
              />
              <input
                value={post.user}
                onChange={(e) => {
                  const next = [...(ls.forumPosts ?? [])];
                  next[i] = { ...next[i], user: e.target.value };
                  patchLearner(setDraft, { forumPosts: next });
                }}
                className={fieldClass}
                placeholder="Author"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={post.replies}
                  onChange={(e) => {
                    const next = [...(ls.forumPosts ?? [])];
                    next[i] = { ...next[i], replies: parseInt(e.target.value, 10) || 0 };
                    patchLearner(setDraft, { forumPosts: next });
                  }}
                  className={`${fieldClass} w-16`}
                  title="Replies"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchLearner(setDraft, {
                      forumPosts: (ls.forumPosts ?? []).filter((_, j) => j !== i),
                    })
                  }
                  className="rounded p-1.5 text-red-300 hover:bg-red-500/10"
                  aria-label="Remove post"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            patchLearner(setDraft, { forumPosts: [...(ls.forumPosts ?? []), newLearnerForumPost()] })
          }
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300"
        >
          <Plus className="h-3.5 w-3.5" /> Add forum thread
        </button>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Learning resource tiles"
        description="Colored tiles on the hub. Enable auto-count to pull file totals from Downloads tab."
      >
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[11px] text-gray-300">
          <input
            type="checkbox"
            checked={ls.useMaterialCounts ?? true}
            onChange={(e) => patchLearner(setDraft, { useMaterialCounts: e.target.checked })}
            className="accent-emerald-500"
          />
          Auto-update PDF / slides / workbook counts from uploaded materials
        </label>
        <ul className="space-y-2">
          {(ls.resourceTiles ?? []).map((tile, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_100px_140px_auto]">
              <input
                value={tile.label}
                onChange={(e) => {
                  const next = [...(ls.resourceTiles ?? [])];
                  next[i] = { ...next[i], label: e.target.value };
                  patchLearner(setDraft, { resourceTiles: next });
                }}
                className={fieldClass}
                placeholder="Label"
              />
              <input
                value={tile.count}
                onChange={(e) => {
                  const next = [...(ls.resourceTiles ?? [])];
                  next[i] = { ...next[i], count: e.target.value };
                  patchLearner(setDraft, { resourceTiles: next });
                }}
                className={fieldClass}
                placeholder="12 Files"
                disabled={ls.useMaterialCounts && ["pdf", "slides", "workbook"].includes(tile.type)}
              />
              <select
                value={tile.type}
                onChange={(e) => {
                  const next = [...(ls.resourceTiles ?? [])];
                  next[i] = { ...next[i], type: e.target.value as TutorLedLearnerResourceTileType };
                  patchLearner(setDraft, { resourceTiles: next });
                }}
                className={fieldClass}
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  patchLearner(setDraft, {
                    resourceTiles: (ls.resourceTiles ?? []).filter((_, j) => j !== i),
                  })
                }
                className="rounded p-1.5 text-red-300 hover:bg-red-500/10"
                aria-label="Remove tile"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            patchLearner(setDraft, {
              resourceTiles: [...(ls.resourceTiles ?? []), newLearnerResourceTile()],
            })
          }
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300"
        >
          <Plus className="h-3.5 w-3.5" /> Add resource tile
        </button>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Quick links & achievements"
        description="Sidebar quick links and achievement badges on the hub."
      >
        <p className="text-[11px] font-medium text-gray-300">Quick links</p>
        <ul className="mt-2 space-y-2">
          {(ls.quickLinks ?? []).map((link, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
              <input
                value={link.label}
                onChange={(e) => {
                  const next = [...(ls.quickLinks ?? [])];
                  next[i] = { ...next[i], label: e.target.value };
                  patchLearner(setDraft, { quickLinks: next });
                }}
                className={fieldClass}
                placeholder="Label"
              />
              <input
                value={link.href}
                onChange={(e) => {
                  const next = [...(ls.quickLinks ?? [])];
                  next[i] = { ...next[i], href: e.target.value };
                  patchLearner(setDraft, { quickLinks: next });
                }}
                className={fieldClass}
                placeholder="/my-learning?tab=…"
              />
              <select
                value={link.icon}
                onChange={(e) => {
                  const next = [...(ls.quickLinks ?? [])];
                  next[i] = { ...next[i], icon: e.target.value };
                  patchLearner(setDraft, { quickLinks: next });
                }}
                className={fieldClass}
              >
                {TUTOR_LED_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  patchLearner(setDraft, {
                    quickLinks: (ls.quickLinks ?? []).filter((_, j) => j !== i),
                  })
                }
                className="rounded p-1.5 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            patchLearner(setDraft, { quickLinks: [...(ls.quickLinks ?? []), newLearnerQuickLink()] })
          }
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300"
        >
          <Plus className="h-3.5 w-3.5" /> Add quick link
        </button>

        <p className="mt-5 text-[11px] font-medium text-gray-300">Achievements</p>
        <ul className="mt-2 space-y-2">
          {(ls.achievements ?? []).map((badge, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_120px_auto]">
              <input
                value={badge.label}
                onChange={(e) => {
                  const next = [...(ls.achievements ?? [])];
                  next[i] = { ...next[i], label: e.target.value };
                  patchLearner(setDraft, { achievements: next });
                }}
                className={fieldClass}
                placeholder="Badge label"
              />
              <select
                value={badge.icon}
                onChange={(e) => {
                  const next = [...(ls.achievements ?? [])];
                  next[i] = { ...next[i], icon: e.target.value };
                  patchLearner(setDraft, { achievements: next });
                }}
                className={fieldClass}
              >
                {TUTOR_LED_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  patchLearner(setDraft, {
                    achievements: (ls.achievements ?? []).filter((_, j) => j !== i),
                  })
                }
                className="rounded p-1.5 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            patchLearner(setDraft, {
              achievements: [...(ls.achievements ?? []), newLearnerAchievement()],
            })
          }
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300"
        >
          <Plus className="h-3.5 w-3.5" /> Add achievement
        </button>
      </AdminContentScopeSection>

      <AdminContentScopeSection
        scope="course"
        title="Sticky footer actions"
        description="Bottom bar buttons on the enrolled learner hub."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["footerJoinLabel", "Join live"],
              ["footerRecordingLabel", "Watch recording"],
              ["footerNotesLabel", "Download notes"],
              ["footerTrainerLabel", "Ask trainer"],
              ["joinZoomLabel", "Hero — Join Zoom"],
              ["watchRecordingLabel", "Hero — Watch recording"],
              ["downloadNotesLabel", "Hero — Download notes"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[10px] text-gray-500">{label}</span>
              <input
                value={ls[key] ?? ""}
                onChange={(e) => patchLearner(setDraft, { [key]: e.target.value })}
                className={fieldClass}
              />
            </label>
          ))}
        </div>
      </AdminContentScopeSection>
    </div>
  );
}
