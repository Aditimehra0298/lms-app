"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  GripVertical,
  Mic,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Type,
  Upload,
  Video,
} from "lucide-react";

type LessonType = "video" | "document" | "quiz";

type Lesson = {
  id: string;
  label: string;
  title: string;
  type: LessonType;
  duration?: string;
  published?: boolean;
};

type Module = {
  id: string;
  title: string;
  lessonCount: number;
  lessons: Lesson[];
};

const INITIAL_MODULES: Module[] = [
  {
    id: "m1",
    title: "Introduction to Cyber Security",
    lessonCount: 4,
    lessons: [
      { id: "1.1", label: "1.1", title: "What is Cyber Security?", type: "video", duration: "00:15:30", published: true },
      { id: "1.2", label: "1.2", title: "Threat Landscape Overview", type: "document", duration: "00:12:00", published: true },
      { id: "1.3", label: "1.3", title: "Security Mindset Quiz", type: "quiz", duration: "00:08:00", published: true },
      { id: "1.4", label: "1.4", title: "Course Roadmap", type: "video", duration: "00:10:15", published: true },
    ],
  },
  { id: "m2", title: "Network Security Basics", lessonCount: 6, lessons: [] },
  { id: "m3", title: "Cryptography Essentials", lessonCount: 5, lessons: [] },
  { id: "m4", title: "Incident Response", lessonCount: 7, lessons: [] },
  { id: "m5", title: "Capstone Project", lessonCount: 6, lessons: [] },
];

const TABS = [
  "Course Info",
  "Core Section",
  "Pricing",
  "Settings",
  "SEO",
  "Students",
  "Certificates",
  "Publish",
] as const;

const CONTENT_TYPES: { label: string; icon: typeof Video; color: string }[] = [
  { label: "Video", icon: Video, color: "from-violet-600 to-indigo-600" },
  { label: "PDF / Doc", icon: FileText, color: "from-rose-500 to-orange-500" },
  { label: "Quiz", icon: ClipboardList, color: "from-emerald-500 to-teal-600" },
  { label: "Assignment", icon: FileText, color: "from-sky-500 to-blue-600" },
  { label: "Tutor Led", icon: Mic, color: "from-fuchsia-500 to-purple-600" },
  { label: "Text", icon: Type, color: "from-slate-500 to-slate-700" },
  { label: "Timer", icon: Timer, color: "from-amber-500 to-yellow-600" },
  { label: "Survey", icon: BarChart3, color: "from-cyan-500 to-blue-500" },
];

function lessonIcon(type: LessonType) {
  switch (type) {
    case "video":
      return Video;
    case "quiz":
      return ClipboardList;
    default:
      return FileText;
  }
}

export default function AdminCoursesCurriculum() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Core Section");
  const [expandedModuleId, setExpandedModuleId] = useState("m1");
  const [selectedLessonId, setSelectedLessonId] = useState("1.1");
  const [lessonTitle, setLessonTitle] = useState("What is Cyber Security?");
  const [lessonType, setLessonType] = useState("Video");
  const [description, setDescription] = useState(
    "Define cyber security, confidentiality, integrity, and availability in organizational contexts.",
  );
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");
  const [previewable, setPreviewable] = useState(true);
  const [freeContent, setFreeContent] = useState(false);
  const [downloadAllowed, setDownloadAllowed] = useState(true);

  const activeModule = useMemo(
    () => INITIAL_MODULES.find((m) => m.id === expandedModuleId) ?? INITIAL_MODULES[0],
    [expandedModuleId],
  );

  const displayedLessons = activeModule.lessons.length > 0 ? activeModule.lessons : [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div>
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
            <span>Courses</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-violet-300">Cyber Security Fundamentals</span>
          </nav>
          <h1 className="text-xl font-semibold text-white md:text-2xl">Course Curriculum</h1>
          <p className="mt-1 text-xs text-gray-400">Cyber Security Fundamentals — structure, lessons, and content types.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-[#0a1120] px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5"
          >
            Preview Course
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-[#0a1120] px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5"
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(111,85,255,0.35)] hover:bg-[#7d63ff]"
          >
            Publish Course
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`relative px-3 py-2.5 text-xs font-medium transition ${
              activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}
            {activeTab === tab ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#6f55ff]" />
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "Core Section" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(260px,320px)]">
            {/* Course structure */}
            <div className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Course Structure</h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
                >
                  <Plus className="h-3 w-3" /> Add Module
                </button>
              </div>
              <div className="space-y-1">
                {INITIAL_MODULES.map((mod) => {
                  const open = expandedModuleId === mod.id;
                  return (
                    <div key={mod.id} className="rounded-lg border border-white/8 bg-black/25">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedModuleId(mod.id);
                          const first = mod.lessons[0];
                          if (first) setSelectedLessonId(first.id);
                        }}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs"
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                        )}
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-200">{mod.title}</span>
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {mod.lessonCount}
                        </span>
                      </button>
                      {open && mod.lessons.length > 0 ? (
                        <ul className="border-t border-white/8 px-2 py-1 pb-2">
                          {mod.lessons.map((les) => {
                            const Icon = lessonIcon(les.type);
                            const sel = selectedLessonId === les.id;
                            return (
                              <li key={les.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLessonId(les.id);
                                    setLessonTitle(les.title);
                                    setLessonType(les.type === "video" ? "Video" : les.type === "quiz" ? "Quiz" : "Document");
                                  }}
                                  className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${
                                    sel ? "bg-[#6f55ff]/25 text-white ring-1 ring-[#6f55ff]/40" : "text-gray-400 hover:bg-white/5"
                                  }`}
                                >
                                  <Icon className="h-3 w-3 shrink-0 opacity-80" />
                                  <span className="text-gray-500">{les.label}</span>
                                  <span className="min-w-0 flex-1 truncate">{les.title}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-[11px] text-gray-400 hover:border-violet-500/40 hover:text-violet-200"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Module
              </button>
            </div>

            {/* Edit lesson */}
            <div className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Edit Lesson</h2>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400">
                  {selectedLessonId}
                </span>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-500">Lesson Title</span>
                  <input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-500">Lesson Type</span>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                  >
                    <option>Video</option>
                    <option>Document</option>
                    <option>Quiz</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-500">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500/40"
                  />
                </label>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="mb-2 text-[11px] font-medium text-gray-400">Video Source</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="vsrc"
                        checked={videoSource === "upload"}
                        onChange={() => setVideoSource("upload")}
                        className="accent-violet-500"
                      />
                      Upload Video
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-gray-400">
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
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-[#0a1120] p-3">
                    <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-md bg-black/50">
                      <Video className="h-6 w-6 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">intro-to-cyber-security.mp4</p>
                      <p className="text-[10px] text-gray-500">Duration 15:30 · 128 MB</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-white/15 p-2 text-gray-400 hover:bg-white/5"
                      title="Replace"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-gray-500">Duration (HH:MM:SS)</span>
                    <input
                      defaultValue="00:15:30"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-gray-500">Preview Duration (minutes)</span>
                    <input
                      defaultValue="3"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                    />
                  </label>
                </div>
                <div className="space-y-2 border-t border-white/10 pt-3">
                  {(
                    [
                      ["Make this lesson previewable", previewable, setPreviewable] as const,
                      ["Free Content", freeContent, setFreeContent] as const,
                      ["Download Allowed", downloadAllowed, setDownloadAllowed] as const,
                    ] as const
                  ).map(([label, on, setOn]) => (
                    <div key={label} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                      <span className="text-gray-300">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => setOn(!on)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                          on ? "bg-emerald-600" : "bg-gray-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
                            on ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
                  >
                    Update Lesson
                  </button>
                </div>
              </div>
            </div>

            {/* Content management */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                <h2 className="mb-3 text-sm font-semibold text-white">Add New Content</h2>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_TYPES.map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      type="button"
                      className={`flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br ${color} p-2 text-center shadow-lg transition hover:brightness-110`}
                    >
                      <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                      <span className="text-[9px] font-semibold leading-tight text-white">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Lesson Content ({displayedLessons.length})</h2>
                </div>
                <ul className="space-y-2">
                  {displayedLessons.map((les) => {
                    const Icon = lessonIcon(les.type);
                    const meta =
                      les.type === "video"
                        ? `Video · ${les.duration ?? "—"}`
                        : les.type === "quiz"
                          ? "Quiz"
                          : "Document";
                    return (
                      <li
                        key={les.id}
                        className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/30 px-2 py-2 text-[11px]"
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                        <Icon className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-200">{les.title}</p>
                          <p className="text-[10px] text-gray-500">{meta}</p>
                        </div>
                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          Published
                        </span>
                        <button type="button" className="shrink-0 rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="shrink-0 rounded p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-300">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-[11px] text-gray-400 hover:border-violet-500/40 hover:text-violet-200"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New Content
                </button>
              </div>
            </div>
          </div>

          {/* Overview */}
          <section className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
            <h2 className="mb-4 text-sm font-semibold text-white">Core Section Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                ["Total Modules", "5"],
                ["Total Lessons", "28"],
                ["Total Duration", "5h 45m"],
                ["Total Quizzes", "6"],
                ["Total Assignments", "4"],
                ["Total Resources", "12"],
              ].map(([k, v]) => (
                <article
                  key={k}
                  className="rounded-xl border border-white/10 bg-[#0d1528] p-3 text-center shadow-inner"
                >
                  <p className="text-[11px] text-gray-500">{k}</p>
                  <p className="mt-2 text-xl font-bold text-white">{v}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-white/10 border-dashed bg-[#0b1224]/80 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-300">{activeTab}</p>
          <p className="mt-2 text-xs text-gray-500">This section is a placeholder — Core Section matches your curriculum mock.</p>
        </div>
      )}
    </div>
  );
}
