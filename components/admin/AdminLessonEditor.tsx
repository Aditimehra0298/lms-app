"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock3,
  FileText,
  FolderOpen,
  Headphones,
  Link2,
  Loader2,
  Presentation,
  StickyNote,
  Subtitles,
  Upload,
  Video,
} from "lucide-react";
import type { CourseCurriculumItem, CourseCurriculumKind } from "@/lib/content-schema";
import AdminAssetUrlField from "@/components/admin/AdminAssetUrlField";

const EXAM_FILE_ACCEPT =
  ".pdf,.doc,.docx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv";
const VIDEO_FILE_ACCEPT =
  ".mp4,.webm,.mov,.m4v,video/mp4,video/webm,video/quicktime,video/x-m4v";
const DOC_FILE_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.txt,.vtt,.srt,audio/mpeg,audio/mp3,audio/wav,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX_VIDEO_UPLOAD_MB = 5 * 1024;

export type LessonRowPatch = Partial<{
  label: string;
  kind: CourseCurriculumKind;
  description: string;
  lessonDurationMinutes: number;
  lessonVideoSizeMb: number;
  previewLimitMinutes: number;
  about: string;
  learningOutcomes: string[];
  notes: string;
  captions: string;
  pdfUrl: string;
  pptUrl: string;
  podcastUrl: string;
  webhookUrl: string;
  resourceUrl: string;
  downloadUrl: string;
  videoUrl: string;
  timedExam: boolean;
  examDurationMinutes: number;
  examUploadUrl: string;
  examPassingScorePercent: number;
}>;

type LearningToolKey =
  | "notes"
  | "captions"
  | "pdf"
  | "ppt"
  | "podcast"
  | "documents"
  | "webhook";

const TOOL_ACCEPT_LABEL: Record<LearningToolKey, string> = {
  notes: "Text notes only",
  captions: ".vtt, .srt, .txt",
  pdf: ".pdf, .doc, .docx",
  ppt: ".ppt, .pptx",
  podcast: ".mp3, .wav",
  documents: ".pdf, .doc, .docx, .ppt, .pptx, .txt",
  webhook: "URL only",
};

const LEARNING_TOOLS: {
  key: LearningToolKey;
  label: string;
  icon: typeof StickyNote;
  field: keyof Pick<
    CourseCurriculumItem,
    "notes" | "captions" | "pdfUrl" | "pptUrl" | "podcastUrl" | "resourceUrl" | "webhookUrl"
  >;
  multiline?: boolean;
  urlOnly?: boolean;
}[] = [
  { key: "notes", label: "Notes", icon: StickyNote, field: "notes", multiline: true },
  { key: "captions", label: "Captions", icon: Subtitles, field: "captions" },
  { key: "pdf", label: "PDF", icon: FileText, field: "pdfUrl" },
  { key: "ppt", label: "PPT", icon: Presentation, field: "pptUrl" },
  { key: "podcast", label: "Podcast", icon: Headphones, field: "podcastUrl" },
  { key: "documents", label: "Documents", icon: FolderOpen, field: "resourceUrl" },
  { key: "webhook", label: "Webhook", icon: Link2, field: "webhookUrl", urlOnly: true },
];

function kindLabel(kind: CourseCurriculumKind): string {
  switch (kind) {
    case "video":
      return "Video";
    case "exam":
      return "Exam";
    default:
      return "Document";
  }
}

function labelToKind(label: string): CourseCurriculumKind {
  if (label === "Exam") return "exam";
  if (label === "Video") return "video";
  return "reading";
}

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

type Props = {
  lesson: CourseCurriculumItem;
  lessonIndexLabel: string;
  onPatch: (patch: LessonRowPatch) => void;
  onSave: () => void;
  saving?: boolean;
};

export default function AdminLessonEditor({
  lesson,
  lessonIndexLabel,
  onPatch,
  onSave,
  saving = false,
}: Props) {
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");
  const [documentSource, setDocumentSource] = useState<"upload" | "url">("upload");
  const [examSource, setExamSource] = useState<"upload" | "url">("upload");
  const [activeTool, setActiveTool] = useState<LearningToolKey | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingTool, setUploadingTool] = useState<LearningToolKey | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedVideoMeta, setSelectedVideoMeta] = useState<{ sizeMb: number } | null>(null);

  useEffect(() => {
    setActiveTool(null);
    setUploadError(null);
    if (lesson.videoUrl?.trim()) setVideoSource("url");
    else setVideoSource("upload");
    const docUrl = lesson.downloadUrl?.trim() || lesson.videoUrl?.trim();
    if (docUrl && lesson.kind === "reading") setDocumentSource("url");
    else setDocumentSource("upload");
    if (lesson.examUploadUrl?.trim()) setExamSource("url");
    else setExamSource("upload");
  }, [lesson.kind, lesson.label, lesson.videoUrl, lesson.downloadUrl, lesson.examUploadUrl]);

  const documentUrl =
    lesson.kind === "reading"
      ? lesson.downloadUrl?.trim() || lesson.videoUrl?.trim() || ""
      : lesson.downloadUrl?.trim() || "";

  const setDocumentUrl = (url: string) => {
    if (lesson.kind === "reading") {
      onPatch({ downloadUrl: url, videoUrl: url });
    } else {
      onPatch({ downloadUrl: url });
    }
  };

  const uploadToolField = async (key: LearningToolKey, file: File) => {
    const tool = LEARNING_TOOLS.find((t) => t.key === key);
    if (!tool || tool.multiline) return;
    setUploadingTool(key);
    try {
      const url = await uploadAdminFile(file);
      onPatch({ [tool.field]: url } as LessonRowPatch);
    } finally {
      setUploadingTool(null);
    }
  };

  const toolHasValue = (key: LearningToolKey) => {
    const tool = LEARNING_TOOLS.find((t) => t.key === key);
    if (!tool) return false;
    const v = lesson[tool.field];
    return typeof v === "string" && v.trim().length > 0;
  };

  const activeToolDef = LEARNING_TOOLS.find((t) => t.key === activeTool);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Edit lesson</h3>
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400">
          {lessonIndexLabel}
        </span>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] text-gray-500">Lesson title</span>
        <input
          value={lesson.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-gray-500">Lesson type</span>
        <select
          value={kindLabel(lesson.kind)}
          onChange={(e) => onPatch({ kind: labelToKind(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
        >
          <option>Video</option>
          <option>Document</option>
          <option>Exam</option>
        </select>
      </label>

      {/* Type-specific primary content */}
      {lesson.kind === "video" ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
          <div className="mb-3 flex items-center gap-2 text-violet-100">
            <Video className="h-4 w-4" />
            <p className="text-[11px] font-semibold">Video lesson</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="vsrc"
                checked={videoSource === "upload"}
                onChange={() => setVideoSource("upload")}
                className="accent-violet-500"
              />
              Upload video
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="vsrc"
                checked={videoSource === "url"}
                onChange={() => setVideoSource("url")}
                className="accent-violet-500"
              />
              Video URL
            </label>
          </div>
          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#0a1120] p-3">
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
              <p className="text-[11px] font-semibold text-cyan-100">Preview settings</p>
              <p className="mt-0.5 text-[10px] text-cyan-200/80">
                Set how many minutes learners must watch before exam tab becomes live.
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-[10px] text-gray-400">Preview limit for users (minutes)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={lesson.previewLimitMinutes ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onPatch({
                    previewLimitMinutes: raw === "" ? undefined : Math.max(0, Math.round(Number(raw) || 0)),
                  });
                }}
                placeholder="e.g. 5"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Rounded minutes are shown to learners. Set <b>0</b> for no preview limit.
              </p>
            </label>
            {videoSource === "upload" ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-violet-400/55 bg-gradient-to-r from-violet-600/30 via-fuchsia-500/20 to-indigo-500/30 py-2 text-xs text-violet-50 shadow-[0_0_18px_rgba(168,85,247,0.28)] hover:from-violet-500/40 hover:to-indigo-500/40">
                <Upload className="h-3.5 w-3.5 text-amber-200" />
                {uploadingVideo ? "Uploading…" : "Upload lesson video"}
                <input
                  type="file"
                  accept={VIDEO_FILE_ACCEPT}
                  className="hidden"
                  disabled={uploadingVideo}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadError(null);
                    setSelectedVideoMeta({
                      sizeMb: Number((f.size / (1024 * 1024)).toFixed(1)),
                    });
                    setUploadingVideo(true);
                    try {
                      const url = await uploadAdminFile(f);
                      onPatch({
                        videoUrl: url,
                        lessonVideoSizeMb: Number((f.size / (1024 * 1024)).toFixed(1)),
                      });
                      setVideoSource("upload");
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : "Upload failed. Please try again.";
                      setUploadError(message);
                    } finally {
                      setUploadingVideo(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            ) : (
              <input
                value={lesson.videoUrl ?? ""}
                onChange={(e) => onPatch({ videoUrl: e.target.value })}
                placeholder="https://…/lesson-video.mp4"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
              />
            )}
            {lesson.videoUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[10px] text-gray-400">Video set</span>
                {lesson.lessonDurationMinutes ? (
                  <span className="inline-flex items-center gap-1 rounded border border-violet-300/35 bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-100">
                    <Clock3 className="h-3 w-3" />
                    {lesson.lessonDurationMinutes} min
                  </span>
                ) : null}
                {typeof lesson.lessonVideoSizeMb === "number" ? (
                  <span className="inline-flex items-center gap-1 rounded border border-cyan-300/35 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-100">
                    {lesson.lessonVideoSizeMb.toFixed(1)} MB
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPatch({ videoUrl: undefined })}
                  className="text-[10px] text-rose-300 hover:text-rose-200"
                >
                  Clear
                </button>
              </div>
            ) : null}
            <p className="text-[10px] text-gray-500">
              Max upload size: {MAX_VIDEO_UPLOAD_MB}MB (default). You can raise it with <b>ADMIN_UPLOAD_MAX_VIDEO_MB</b>.
            </p>
            {selectedVideoMeta ? (
              <p className="text-[10px] text-cyan-200/90">
                Selected file: {selectedVideoMeta.sizeMb}MB
              </p>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-[10px] text-gray-400">
                Video duration (minutes, manual)
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={lesson.lessonDurationMinutes ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onPatch({
                    lessonDurationMinutes: raw === "" ? undefined : Math.max(1, Math.round(Number(raw) || 1)),
                  });
                }}
                placeholder="Enter manually, e.g. 12"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
              />
            </label>
            <p className="text-[10px] text-gray-500">
              Learner exam unlock uses watched preview minutes for this module. Set preview timing to control when
              the exam tab becomes live.
            </p>
            {uploadError ? <p className="text-[10px] text-rose-300">{uploadError}</p> : null}
          </div>
        </div>
      ) : null}

      {lesson.kind === "reading" ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
          <div className="mb-3 flex items-center gap-2 text-emerald-100">
            <FileText className="h-4 w-4" />
            <p className="text-[11px] font-semibold">Document lesson</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="dsrc"
                checked={documentSource === "upload"}
                onChange={() => setDocumentSource("upload")}
                className="accent-emerald-500"
              />
              Upload document
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="dsrc"
                checked={documentSource === "url"}
                onChange={() => setDocumentSource("url")}
                className="accent-emerald-500"
              />
              Document URL
            </label>
          </div>
          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#0a1120] p-3">
            {documentSource === "upload" ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-400/55 bg-gradient-to-r from-emerald-600/30 via-teal-500/20 to-cyan-500/25 py-2 text-xs text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:from-emerald-500/40 hover:to-cyan-500/40">
                <Upload className="h-3.5 w-3.5 text-lime-200" />
                {uploadingDocument ? "Uploading…" : "Upload PDF / Word / PPT"}
                <input
                  type="file"
                  accept={DOC_FILE_ACCEPT}
                  className="hidden"
                  disabled={uploadingDocument}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadingDocument(true);
                    try {
                      const url = await uploadAdminFile(f);
                      setDocumentUrl(url);
                    } finally {
                      setUploadingDocument(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            ) : (
              <input
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://…/document.pdf"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
              />
            )}
            {documentUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[10px] text-gray-400">{documentUrl}</span>
                <button
                  type="button"
                  onClick={() => setDocumentUrl("")}
                  className="text-[10px] text-rose-300 hover:text-rose-200"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {lesson.kind === "exam" ? (
        <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-amber-100">
            <ClipboardList className="h-4 w-4" />
            <p className="text-[11px] font-semibold">Module examination</p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-gray-200">
            <span>Timed exam</span>
            <input
              type="checkbox"
              checked={!!lesson.timedExam}
              onChange={(e) =>
                onPatch({
                  timedExam: e.target.checked,
                  ...(e.target.checked ? {} : { examDurationMinutes: undefined }),
                })
              }
              className="accent-amber-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-gray-500">Duration (minutes)</span>
            <input
              type="number"
              min={1}
              step={1}
              disabled={!lesson.timedExam}
              value={lesson.examDurationMinutes ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onPatch({
                  examDurationMinutes: v === "" ? undefined : Math.max(1, Number(v) || 1),
                });
              }}
              placeholder="e.g. 30"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-gray-500">Passing score (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={lesson.examPassingScorePercent ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onPatch({
                  examPassingScorePercent:
                    v === "" ? undefined : Math.min(100, Math.max(0, Math.round(Number(v) || 0))),
                });
              }}
              placeholder="e.g. 70"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="rounded-lg border border-white/10 bg-[#0a1120] p-3">
            <p className="mb-2 text-[11px] font-medium text-amber-100">Exam paper / attachment</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
                <input
                  type="radio"
                  name="esrc"
                  checked={examSource === "upload"}
                  onChange={() => setExamSource("upload")}
                  className="accent-amber-500"
                />
                Upload
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
                <input
                  type="radio"
                  name="esrc"
                  checked={examSource === "url"}
                  onChange={() => setExamSource("url")}
                  className="accent-amber-500"
                />
                URL
              </label>
            </div>
            <div className="mt-2 space-y-2">
              {examSource === "upload" ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-400/55 bg-gradient-to-r from-amber-600/30 via-orange-500/20 to-yellow-500/25 py-2 text-xs text-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.28)] hover:from-amber-500/40 hover:to-yellow-500/40">
                  <Upload className="h-3.5 w-3.5 text-amber-100" />
                  {uploadingExam ? "Uploading…" : "Upload exam file (PDF / Word / CSV)"}
                  <input
                    type="file"
                    accept={EXAM_FILE_ACCEPT}
                    className="hidden"
                    disabled={uploadingExam}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadingExam(true);
                      try {
                        const url = await uploadAdminFile(f);
                        onPatch({ examUploadUrl: url });
                      } finally {
                        setUploadingExam(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              ) : (
                <input
                  value={lesson.examUploadUrl ?? ""}
                  onChange={(e) => onPatch({ examUploadUrl: e.target.value })}
                  placeholder="https://…/exam.pdf"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              )}
              {lesson.examUploadUrl ? (
                <button
                  type="button"
                  onClick={() => onPatch({ examUploadUrl: undefined })}
                  className="text-[10px] text-rose-300 hover:text-rose-200"
                >
                  Clear attachment
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[11px] text-gray-500">Description</span>
        <textarea
          value={lesson.description ?? ""}
          onChange={(e) => onPatch({ description: e.target.value })}
          rows={3}
          placeholder="Lesson summary for your team."
          className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
        />
      </label>

      {lesson.kind === "video" ? (
        <>
          <label className="block">
            <span className="mb-1 block text-[11px] text-gray-500">About this lesson (shown below video)</span>
            <textarea
              value={lesson.about ?? ""}
              onChange={(e) => onPatch({ about: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-gray-500">Learning outcomes (one per line)</span>
            <textarea
              value={(lesson.learningOutcomes ?? []).join("\n")}
              onChange={(e) =>
                onPatch({
                  learningOutcomes: e.target.value
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
            />
          </label>
        </>
      ) : null}

      {/* Learning tools — icon strip */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="mb-2 text-[11px] font-medium text-violet-100">Module learning tools</p>
        <p className="mb-3 text-[10px] text-gray-500">
          Click an icon to open its editor — upload a file or paste a URL.
        </p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.key;
            const filled = toolHasValue(tool.key);
            return (
              <button
                key={tool.key}
                type="button"
                title={`${tool.label} (${TOOL_ACCEPT_LABEL[tool.key]})`}
                onClick={() => setActiveTool(active === tool.key ? null : tool.key)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  active
                    ? "border-amber-300/80 bg-gradient-to-br from-amber-400/40 via-orange-400/25 to-violet-500/30 text-amber-50 ring-2 ring-amber-300/45 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                    : filled
                      ? "border-violet-300/45 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.22)]"
                      : "border-cyan-400/25 bg-gradient-to-br from-slate-900 to-[#1a2340] text-cyan-200/75 hover:border-cyan-300/55 hover:text-cyan-100"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {activeToolDef ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-[10px] text-gray-500">
              Format: <span className="text-gray-300">{TOOL_ACCEPT_LABEL[activeToolDef.key]}</span>
            </p>
            <AdminAssetUrlField
              label={activeToolDef.label}
              value={(lesson[activeToolDef.field] as string | undefined) ?? ""}
              onChange={(v) => onPatch({ [activeToolDef.field]: v } as LessonRowPatch)}
              onUpload={(file) => uploadToolField(activeToolDef.key, file)}
              uploading={uploadingTool === activeToolDef.key}
              accept={DOC_FILE_ACCEPT}
              multiline={activeToolDef.multiline}
              urlOnly={activeToolDef.urlOnly}
              uploadLabel={`Upload ${activeToolDef.label.toLowerCase()}`}
              urlPlaceholder={
                activeToolDef.key === "webhook"
                  ? "https://…/webhook"
                  : `https://…/${activeToolDef.label.toLowerCase()}`
              }
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Update lesson
        </button>
      </div>
    </div>
  );
}
