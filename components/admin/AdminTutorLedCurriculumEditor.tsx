"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Upload, Wand2, Pencil } from "lucide-react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  autoGenerateCurriculumDays,
  defaultManualDaysFromWeek,
  newCurriculumDayId,
  type TutorLedContentMode,
  type TutorLedCurriculumDay,
  type TutorLedCurriculumWeek,
} from "@/lib/tutor-led-curriculum-days";
import { AdminModeToggle } from "@/components/admin/AdminModeToggle";

const tlField =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50";

type Props = {
  draft: TutorLedProgramStored;
  setDraft: React.Dispatch<React.SetStateAction<TutorLedProgramStored | null>>;
  onUploadImage: (file: File, onUrl: (url: string) => void) => Promise<void>;
};

function weekAsExt(week: TutorLedProgramStored["curriculum"][number]): TutorLedCurriculumWeek {
  return week as TutorLedCurriculumWeek;
}

export function AdminTutorLedCurriculumEditor({ draft, setDraft, onUploadImage }: Props) {
  const mode: TutorLedContentMode = draft.curriculumMode ?? "auto";
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 0: true });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const setMode = (m: TutorLedContentMode) => {
    setDraft({ ...draft, curriculumMode: m });
  };

  const patchWeek = (i: number, patch: Partial<TutorLedCurriculumWeek>) => {
    const next = [...draft.curriculum];
    next[i] = { ...next[i], ...patch };
    setDraft({ ...draft, curriculum: next });
  };

  const patchWeekDays = (weekIndex: number, days: TutorLedCurriculumDay[]) => {
    patchWeek(weekIndex, { days });
  };

  const handleUpload = async (key: string, file: File, apply: (url: string) => void) => {
    setUploadingKey(key);
    try {
      await onUploadImage(file, apply);
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <AdminModeToggle
        label="Curriculum days"
        value={mode}
        onChange={(id) => setMode(id as TutorLedContentMode)}
        options={[
          { id: "auto", label: "Automatic" },
          { id: "manual", label: "Manual" },
        ]}
      />
      <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-gray-400">
        {mode === "auto" ? (
          <>
            <Wand2 className="mr-1 inline h-3 w-3 text-violet-300" aria-hidden />
            Each week auto-builds <strong className="text-gray-300">5 days</strong> from the week topic. Edit week
            fields below; change to <strong className="text-gray-300">Manual</strong> to edit every day and image.
          </>
        ) : (
          <>
            <Pencil className="mr-1 inline h-3 w-3 text-amber-300" aria-hidden />
            Edit each day’s title, duration, type, recording link, and thumbnail. Use &quot;Reset from auto&quot; to
            regenerate days from the week topic.
          </>
        )}
      </p>

      <div className="space-y-3">
        {draft.curriculum.map((row, weekIndex) => {
          const ext = weekAsExt(row);
          const open = !!openWeeks[weekIndex];
          const days =
            mode === "manual" && ext.days?.length
              ? ext.days
              : autoGenerateCurriculumDays(row, weekIndex);

          return (
            <div key={weekIndex} className="rounded-xl border border-white/10 bg-black/25">
              <button
                type="button"
                onClick={() => setOpenWeeks((p) => ({ ...p, [weekIndex]: !p[weekIndex] }))}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-xs font-semibold text-white">
                  Week {row.week}: {row.topic || row.label || "Untitled"}
                </span>
                <span className="ml-auto text-[10px] text-gray-500">{days.length} days</span>
              </button>

              {open ? (
                <div className="space-y-3 border-t border-white/10 px-3 pb-3 pt-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block">
                      <span className="text-[10px] text-gray-500">Week #</span>
                      <input
                        type="number"
                        value={row.week}
                        onChange={(e) => patchWeek(weekIndex, { week: Number(e.target.value) || 1 })}
                        className={tlField}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-gray-500">Label</span>
                      <input
                        value={row.label}
                        onChange={(e) => patchWeek(weekIndex, { label: e.target.value })}
                        className={tlField}
                      />
                    </label>
                    <label className="block sm:col-span-2 lg:col-span-1">
                      <span className="text-[10px] text-gray-500">Topic</span>
                      <input
                        value={row.topic}
                        onChange={(e) => patchWeek(weekIndex, { topic: e.target.value })}
                        className={tlField}
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-[10px] text-gray-500">Key learning</span>
                      <input
                        value={row.keyLearning}
                        onChange={(e) => patchWeek(weekIndex, { keyLearning: e.target.value })}
                        className={tlField}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-gray-500">Session type</span>
                      <input
                        value={row.sessionType}
                        onChange={(e) => patchWeek(weekIndex, { sessionType: e.target.value })}
                        className={tlField}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[10px] text-gray-500">Week banner image URL</span>
                    <input
                      value={ext.weekImageUrl ?? ""}
                      onChange={(e) => patchWeek(weekIndex, { weekImageUrl: e.target.value })}
                      className={tlField + " font-mono text-[11px]"}
                    />
                    <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] text-violet-300">
                      <Upload className="h-3 w-3" />
                      {uploadingKey === `week-${weekIndex}` ? "Uploading…" : "Upload week image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f)
                            void handleUpload(`week-${weekIndex}`, f, (url) =>
                              patchWeek(weekIndex, { weekImageUrl: url }),
                            );
                        }}
                      />
                    </label>
                  </label>

                  {mode === "manual" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-violet-300"
                        onClick={() =>
                          patchWeekDays(weekIndex, defaultManualDaysFromWeek(row, weekIndex))
                        }
                      >
                        Reset days from auto
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-violet-300"
                        onClick={() =>
                          patchWeekDays(weekIndex, [
                            ...(ext.days ?? []),
                            {
                              id: newCurriculumDayId(),
                              label: `Day ${(ext.days?.length ?? 0) + 1}`,
                              title: "",
                              duration: "2h 00m",
                              kind: "recording",
                            },
                          ])
                        }
                      >
                        + Add day
                      </button>
                    </div>
                  ) : null}

                  <ul className="space-y-2">
                    {days.map((day, dayIndex) => {
                      const isManual = mode === "manual";
                      const updateDay = (patch: Partial<TutorLedCurriculumDay>) => {
                        if (!isManual) return;
                        const base = ext.days?.length
                          ? [...ext.days]
                          : defaultManualDaysFromWeek(row, weekIndex);
                        base[dayIndex] = { ...base[dayIndex], ...patch };
                        patchWeekDays(weekIndex, base);
                      };

                      return (
                        <li
                          key={day.id}
                          className="rounded-lg border border-white/10 bg-black/30 p-2 text-[11px]"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-300">
                              {day.label}
                              {!isManual ? (
                                <span className="ml-2 font-normal text-gray-600">(auto)</span>
                              ) : null}
                            </span>
                            {isManual ? (
                              <button
                                type="button"
                                className="text-red-300"
                                onClick={() => {
                                  const base = ext.days ?? defaultManualDaysFromWeek(row, weekIndex);
                                  patchWeekDays(
                                    weekIndex,
                                    base.filter((_, j) => j !== dayIndex),
                                  );
                                }}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                          {isManual ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                value={day.label}
                                onChange={(e) => updateDay({ label: e.target.value })}
                                placeholder="Day label"
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 outline-none"
                              />
                              <input
                                value={day.duration}
                                onChange={(e) => updateDay({ duration: e.target.value })}
                                placeholder="Duration"
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 outline-none"
                              />
                              <input
                                value={day.title}
                                onChange={(e) => updateDay({ title: e.target.value })}
                                placeholder="Title"
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 outline-none sm:col-span-2"
                              />
                              <select
                                value={day.kind}
                                onChange={(e) =>
                                  updateDay({
                                    kind: e.target.value as TutorLedCurriculumDay["kind"],
                                  })
                                }
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 text-white outline-none"
                              >
                                <option value="recording">Recording</option>
                                <option value="lab">Lab</option>
                                <option value="live">Live</option>
                              </select>
                              <input
                                value={day.recordingUrl ?? ""}
                                onChange={(e) => updateDay({ recordingUrl: e.target.value })}
                                placeholder="Recording / video URL"
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] outline-none sm:col-span-2"
                              />
                              <input
                                value={day.imageUrl ?? ""}
                                onChange={(e) => updateDay({ imageUrl: e.target.value })}
                                placeholder="Day thumbnail URL"
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] outline-none sm:col-span-2"
                              />
                              <label className="inline-flex cursor-pointer items-center gap-1 text-violet-300 sm:col-span-2">
                                <Upload className="h-3 w-3" />
                                {uploadingKey === day.id ? "Uploading…" : "Upload day image"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    if (f)
                                      void handleUpload(day.id, f, (url) => updateDay({ imageUrl: url }));
                                  }}
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="text-gray-500">{day.title}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        curriculum: draft.curriculum.filter((_, j) => j !== weekIndex),
                      })
                    }
                  >
                    Remove entire week
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="text-[11px] font-semibold text-violet-300"
        onClick={() =>
          setDraft({
            ...draft,
            curriculum: [
              ...draft.curriculum,
              {
                week: draft.curriculum.length + 1,
                label: "",
                topic: "",
                keyLearning: "",
                sessionType: "Live",
              },
            ],
          })
        }
      >
        + Add week
      </button>
    </div>
  );
}
