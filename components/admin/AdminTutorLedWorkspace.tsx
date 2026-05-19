"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  Video,
  IndianRupee,
  Radio,
  CalendarDays,
} from "lucide-react";
import { AdminModeToggle } from "@/components/admin/AdminModeToggle";
import { AdminTutorLedCurriculumEditor } from "@/components/admin/AdminTutorLedCurriculumEditor";
import { AdminTutorLedMediaPanel } from "@/components/admin/AdminTutorLedMediaPanel";
import type { AdminContent } from "@/lib/content-schema";
import { defaultAdminContent } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import { TUTOR_LED_ICON_NAMES } from "@/lib/tutor-led-program-map";
import {
  newLearningMaterialId,
  TUTOR_LED_TOOL_META,
  type TutorLedLearningMaterial,
  type TutorLedToolKind,
} from "@/lib/tutor-led-learning-tools";
import {
  isZoomJoinUrl,
  formatZoomMeetingId,
  parseZoomMeetingFromUrl,
  resolveZoomJoinUrl,
  ZOOM_PREMIUM_ADMIN_HINTS,
} from "@/lib/zoom-meeting";

const LEARNING_TOOL_KINDS: TutorLedToolKind[] = ["pad-notes", "ppt", "webbook"];

const ACCEPT_BY_KIND: Record<TutorLedToolKind, string> = {
  "pad-notes": ".pdf,.doc,.docx,.txt",
  ppt: ".ppt,.pptx,.pdf",
  webbook: ".pdf",
};

const tlField =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

type EditorTab =
  | "basics"
  | "zoom"
  | "pricing"
  | "media"
  | "trainer"
  | "curriculum"
  | "marketing"
  | "downloads"
  | "faqs";
type ListFilter = "all" | "published" | "draft";

const EDITOR_TABS: { id: EditorTab; label: string; icon: typeof BookOpen }[] = [
  { id: "basics", label: "Basics", icon: BookOpen },
  { id: "zoom", label: "Zoom & live", icon: Video },
  { id: "pricing", label: "Pricing", icon: IndianRupee },
  { id: "media", label: "Images", icon: ImageIcon },
  { id: "trainer", label: "Trainer", icon: User },
  { id: "curriculum", label: "Curriculum & days", icon: CalendarDays },
  { id: "marketing", label: "Page content", icon: FileText },
  { id: "downloads", label: "Downloads", icon: Upload },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
];

function materialCount(p: TutorLedProgramStored) {
  return (p.learningMaterials ?? []).filter((m) => m.downloadUrl?.trim()).length;
}

function discountLabel(sale: number, list: number): string {
  if (list <= 0 || sale >= list) return "";
  return `${Math.round((1 - sale / list) * 100)}% OFF`;
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  if (!src.trim()) return null;
  return (
    <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

function cloneProgram(p: TutorLedProgramStored): TutorLedProgramStored {
  return JSON.parse(JSON.stringify(p)) as TutorLedProgramStored;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newProgramFromTemplate(): TutorLedProgramStored {
  const base = cloneProgram(defaultTutorLedPrograms[0]);
  const id = `new-live-${Date.now()}`;
  return {
    ...base,
    slug: id,
    title: "New live program",
    published: false,
    learningMaterials: [],
    liveJoinUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    curriculumMode: "auto",
    zoomLinkMode: "manual",
  };
}

function applyZoomPaste(draft: TutorLedProgramStored, pastedUrl: string): TutorLedProgramStored {
  const trimmed = pastedUrl.trim();
  if (!trimmed) return { ...draft, liveJoinUrl: "" };
  const parsed = parseZoomMeetingFromUrl(trimmed);
  return {
    ...draft,
    liveJoinUrl: trimmed,
    zoomMeetingId: parsed.meetingId ?? draft.zoomMeetingId ?? "",
    zoomPasscode: parsed.passcode ?? draft.zoomPasscode ?? "",
  };
}

function applyMeetingIdField(draft: TutorLedProgramStored, raw: string): TutorLedProgramStored {
  const zoomMeetingId = raw.replace(/\s/g, "");
  const liveJoinUrl = draft.liveJoinUrl?.trim()
    ? draft.liveJoinUrl
    : zoomMeetingId
      ? `https://zoom.us/j/${zoomMeetingId}`
      : "";
  return { ...draft, zoomMeetingId, liveJoinUrl };
}

export default function AdminTutorLedWorkspace() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TutorLedProgramStored | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /** Slug when editor was opened (so renames replace the correct row). */
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [uploadingMaterialId, setUploadingMaterialId] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLearnerHero, setUploadingLearnerHero] = useState(false);
  const [uploadingTrainerAvatar, setUploadingTrainerAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("basics");
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [zoomApiConfigured, setZoomApiConfigured] = useState(false);
  const [zoomAutoRecord, setZoomAutoRecord] = useState(true);
  const [zoomApiBusy, setZoomApiBusy] = useState(false);
  const [zoomApiMessage, setZoomApiMessage] = useState<string | null>(null);

  const programs = useMemo(
    () => (content?.tutorLedPrograms?.length ? content.tutorLedPrograms : defaultTutorLedPrograms),
    [content?.tutorLedPrograms],
  );

  const publishedCount = useMemo(() => programs.filter((p) => p.published).length, [programs]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (listFilter === "published") list = list.filter((p) => p.published);
    if (listFilter === "draft") list = list.filter((p) => !p.published);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
    }
    return list;
  }, [programs, listFilter, searchQuery]);

  const load = useCallback(async (): Promise<AdminContent | null> => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as AdminContent;
      setContent(data);
      return data;
    } catch {
      setLoadError("Could not load admin content. Using defaults until save succeeds.");
      setContent(defaultAdminContent);
      return defaultAdminContent;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/zoom/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { configured?: boolean; autoRecordCloud?: boolean };
        setZoomApiConfigured(Boolean(data.configured));
        setZoomAutoRecord(data.autoRecordCloud !== false);
      } catch {
        setZoomApiConfigured(false);
      }
    })();
  }, []);

  const refreshDraftFromSaved = (slug: string, data: AdminContent | null) => {
    const list = data?.tutorLedPrograms?.length ? data.tutorLedPrograms : defaultTutorLedPrograms;
    const row = list.find((p) => p.slug === slug);
    if (row) setDraft(cloneProgram(row));
  };

  const createZoomMeetingViaApi = async () => {
    if (!draft?.slug) {
      setZoomApiMessage("Save a slug first, then create the Zoom meeting.");
      return;
    }
    setZoomApiBusy(true);
    setZoomApiMessage(null);
    try {
      const res = await fetch("/api/admin/zoom/create-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          topic: draft.title || draft.slug,
          persist: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        meeting?: { joinUrl: string; id: string; password: string; uuid: string };
      };
      if (!res.ok || !data.ok || !data.meeting) {
        throw new Error(data.error ?? "Could not create Zoom meeting");
      }
      const m = data.meeting;
      setDraft((prev) =>
        prev
          ? applyZoomPaste(
              { ...prev, zoomMeetingUuid: m.uuid },
              m.joinUrl,
            )
          : prev,
      );
      const saved = await load();
      refreshDraftFromSaved(draft.slug, saved);
      setZoomApiMessage(
        zoomAutoRecord
          ? "Zoom meeting created with cloud recording enabled. Join link saved."
          : "Zoom meeting created and join link saved.",
      );
    } catch (e) {
      setZoomApiMessage(e instanceof Error ? e.message : "Zoom API failed");
    } finally {
      setZoomApiBusy(false);
    }
  };

  const syncZoomRecordingsViaApi = async () => {
    if (!draft?.slug) {
      setZoomApiMessage("Select a program with a saved slug first.");
      return;
    }
    setZoomApiBusy(true);
    setZoomApiMessage(null);
    try {
      const res = await fetch("/api/admin/zoom/sync-recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          meetingId: draft.zoomMeetingId,
          persist: true,
          addToMaterials: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        count?: number;
        recordings?: TutorLedProgramStored["zoomRecordings"];
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not sync recordings");
      const saved = await load();
      refreshDraftFromSaved(draft.slug, saved);
      setZoomApiMessage(
        data.count
          ? `Synced ${data.count} recording(s) — visible on learner dashboard and Downloads.`
          : "No cloud recordings yet. Run a live session with recording on, then sync again.",
      );
    } catch (e) {
      setZoomApiMessage(e instanceof Error ? e.message : "Zoom sync failed");
    } finally {
      setZoomApiBusy(false);
    }
  };

  const persistPrograms = async (
    next: TutorLedProgramStored[],
    opts?: { keepEditor?: boolean; editorSlug?: string },
  ) => {
    if (!content) return;
    setSaving(true);
    setLoadError(null);
    try {
      const payload: AdminContent = { ...content, tutorLedPrograms: next };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
      if (opts?.keepEditor && opts.editorSlug) {
        const refreshed = next.find((p) => p.slug === opts.editorSlug);
        if (refreshed) setDraft(cloneProgram(refreshed));
      } else if (!opts?.keepEditor) {
        setDraft(null);
        setIsCreating(false);
        setOriginalSlug(null);
      }
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (p: TutorLedProgramStored) => {
    const next = programs.map((row) =>
      row.slug === p.slug ? { ...row, published: !row.published } : row,
    );
    await persistPrograms(next, { keepEditor: true, editorSlug: p.slug });
  };

  const openCreate = () => {
    setIsCreating(true);
    setOriginalSlug(null);
    setActiveTab("basics");
    setDraft(newProgramFromTemplate());
  };

  const openEdit = (p: TutorLedProgramStored) => {
    setIsCreating(false);
    setOriginalSlug(p.slug);
    setActiveTab("basics");
    setDraft(cloneProgram(p));
  };

  const uploadImageField = async (
    file: File,
    apply: (url: string) => void,
    setBusy: (v: boolean) => void,
    errLabel: string,
  ) => {
    if (!draft) return;
    setBusy(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      apply(data.url);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : errLabel);
    } finally {
      setBusy(false);
    }
  };

  const patchPrices = (patch: Partial<Pick<TutorLedProgramStored, "price" | "originalPrice" | "priceAfterPayment">>) => {
    if (!draft) return;
    const price = patch.price ?? draft.price;
    const originalPrice = patch.originalPrice ?? draft.originalPrice;
    const next: TutorLedProgramStored = {
      ...draft,
      ...patch,
      discount: discountLabel(price, originalPrice) || draft.discount,
    };
    setDraft(next);
  };

  const saveDraft = async () => {
    if (!draft || !content) return;
    const slug = slugify(draft.slug || draft.title);
    if (!slug) {
      setLoadError("Slug is required (use letters, numbers, hyphens).");
      return;
    }
    const normalized = { ...draft, slug };

    if (isCreating) {
      if (programs.some((p) => p.slug === slug)) {
        setLoadError("That slug already exists. Change the slug before saving.");
        return;
      }
      await persistPrograms([...programs, normalized]);
      return;
    }

    if (programs.some((p) => p.slug === slug && p.slug !== originalSlug)) {
      setLoadError("Another program already uses that slug.");
      return;
    }
    const removed = programs.filter((p) => p.slug !== originalSlug);
    await persistPrograms([...removed, normalized]);
  };

  const patchLearningMaterials = (next: TutorLedLearningMaterial[]) => {
    if (!draft) return;
    setDraft({ ...draft, learningMaterials: next });
  };

  const addLearningMaterial = (kind: TutorLedToolKind) => {
    if (!draft) return;
    const meta = TUTOR_LED_TOOL_META[kind];
    const list = draft.learningMaterials ?? [];
    patchLearningMaterials([
      ...list,
      { id: newLearningMaterialId(), kind, title: `New ${meta.shortLabel}`, downloadUrl: "" },
    ]);
  };

  const updateLearningMaterial = (id: string, patch: Partial<TutorLedLearningMaterial>) => {
    if (!draft) return;
    const list = draft.learningMaterials ?? [];
    patchLearningMaterials(list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeLearningMaterial = (id: string) => {
    if (!draft) return;
    const list = draft.learningMaterials ?? [];
    patchLearningMaterials(list.filter((m) => m.id !== id));
  };

  const uploadLearningMaterial = async (id: string, file: File) => {
    setUploadingMaterialId(id);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      updateLearningMaterial(id, { downloadUrl: data.url });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "File upload failed.");
    } finally {
      setUploadingMaterialId(null);
    }
  };

  const deleteProgram = async (slug: string) => {
    if (!window.confirm(`Delete tutor-led program “${slug}”?`)) return;
    await persistPrograms(programs.filter((p) => p.slug !== slug));
    if (draft?.slug === slug) {
      setDraft(null);
      setIsCreating(false);
    }
  };

  if (!content && !loadError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> Loading tutor-led programs…
      </div>
    );
  }

  const iconSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none"
    >
      {TUTOR_LED_ICON_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );

  const tabClass = (tab: EditorTab) =>
    activeTab === tab
      ? "border-violet-400/60 bg-violet-500/15 text-white"
      : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/5 hover:text-gray-200";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Tutor-led programs
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">Live course admin</h1>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Pick a program on the left, edit in tabs on the right — marketing page, Zoom, pricing, and downloads.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{programs.length} total</span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
              {publishedCount} live
            </span>
          </div>
        </div>
        {loadError ? (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{loadError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 space-y-3 lg:w-80 xl:w-96">
          <div className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
            <button
              type="button"
              onClick={openCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6f55ff] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#7d63ff]"
            >
              <Plus className="h-4 w-4" /> New program
            </button>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or slug…"
                className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-xs text-white outline-none focus:border-violet-500/40"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["published", "Live"],
                  ["draft", "Draft"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setListFilter(id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    listFilter === id
                      ? "bg-violet-500/25 text-violet-100"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-0.5">
            {filteredPrograms.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-gray-500">
                {programs.length === 0 ? "No programs yet — create one above." : "No matches for this search."}
              </li>
            ) : (
              filteredPrograms.map((p) => {
                const selected = draft?.slug === p.slug;
                return (
                  <li key={p.slug}>
                    <div
                      className={`rounded-xl border transition ${
                        selected
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-white/10 bg-[#0d1528] hover:border-white/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="w-full rounded-t-xl p-3 text-left"
                      >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{p.title || "Untitled"}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-gray-500">{p.slug}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? "text-violet-300" : "text-gray-600"}`} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            p.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {p.published ? "Live" : "Draft"}
                        </span>
                        {p.liveJoinUrl?.trim() ? (
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] text-sky-200">Zoom</span>
                        ) : null}
                        <span className="text-[9px] text-gray-500">{materialCount(p)} files</span>
                      </div>
                      </button>
                      <div className="flex flex-wrap gap-1 border-t border-white/5 px-3 pb-3 pt-2">
                        <button
                          type="button"
                          onClick={() => void togglePublished(p)}
                          className="rounded px-2 py-0.5 text-[10px] text-gray-300 hover:bg-white/10"
                        >
                          {p.published ? "Unpublish" : "Publish"}
                        </button>
                        <Link
                          href={p.published ? `/tutor-led/${p.slug}` : `/tutor-led/${p.slug}?preview=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/10"
                          title={p.published ? "Public page" : "Draft preview"}
                        >
                          <ExternalLink className="h-3 w-3" /> {p.published ? "View" : "Draft"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteProgram(p.slug)}
                          className="rounded px-2 py-0.5 text-[10px] text-red-300/90 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <main className="min-w-0 flex-1">
          {!draft ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#0d1528]/60 px-6 py-16 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-violet-400/50" aria-hidden />
              <p className="text-sm font-medium text-white">Select a program to edit</p>
              <p className="mt-1 max-w-sm text-xs text-gray-500">
                Or click <strong className="text-gray-400">New program</strong> to add a live course.
              </p>
            </div>
          ) : (
            <section className="flex flex-col rounded-xl border border-violet-500/25 bg-[#0d1528] lg:max-h-[calc(100vh-220px)]">
              <div className="shrink-0 border-b border-white/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {isCreating ? "New program" : draft.title || draft.slug}
                    </h2>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-500">/tutor-led/{draft.slug || "…"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={draft.published}
                        onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                        className="accent-emerald-500"
                      />
                      Published
                    </label>
                    {!draft.published ? (
                      <span className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-100">
                        Public URL returns draft page until Published is on
                      </span>
                    ) : null}
                    <Link
                      href={
                        draft.published
                          ? `/tutor-led/${draft.slug}`
                          : `/tutor-led/${draft.slug}?preview=1`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 hover:bg-violet-500/20"
                      title={draft.published ? "Open public page" : "Draft preview (not public until Published is on)"}
                    >
                      <ExternalLink className="h-3 w-3" /> {draft.published ? "Preview" : "Preview draft"}
                    </Link>
                  </div>
                </div>
                <nav className="mt-3 flex gap-1 overflow-x-auto pb-0.5" aria-label="Editor sections">
                  {EDITOR_TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition ${tabClass(id)}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-200">
                    Zoom link for this course
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-500">Paste join URL from Zoom</span>
                      <input
                        value={draft.liveJoinUrl ?? ""}
                        onChange={(e) => setDraft(applyZoomPaste(draft, e.target.value))}
                        placeholder="https://zoom.us/j/…"
                        className="mt-1 w-full rounded-lg border border-sky-500/30 bg-black/40 px-3 py-2 font-mono text-[11px] text-white outline-none focus:border-sky-400/50"
                      />
                    </label>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {resolveZoomJoinUrl(draft) ? (
                        <a
                          href={resolveZoomJoinUrl(draft)!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/30"
                        >
                          <ExternalLink className="h-3 w-3" /> Test
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("zoom");
                          requestAnimationFrame(() =>
                            document.getElementById("zoom-editor-panel")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          );
                        }}
                        className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5"
                      >
                        More Zoom settings
                      </button>
                    </div>
                  </div>
                  <div
                    id="zoom-meeting-fields"
                    className={`mt-3 rounded-xl border-2 p-3 transition-all ${
                      draft.zoomMeetingId?.trim()
                        ? "border-emerald-400/70 bg-emerald-500/15 shadow-[0_0_24px_rgba(52,211,153,0.2)] ring-2 ring-emerald-400/40"
                        : "border-amber-400/60 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-2 ring-amber-400/30"
                    }`}
                  >
                    <p className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-amber-500/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">
                        Learners see this
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
                        Meeting ID & passcode
                      </span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-amber-200/90">Meeting ID</span>
                      <input
                        value={draft.zoomMeetingId ?? ""}
                        onChange={(e) => setDraft(applyMeetingIdField(draft, e.target.value))}
                        placeholder="e.g. 12345678901"
                        className="mt-1 w-full rounded-lg border-2 border-amber-400/50 bg-black/50 px-3 py-2.5 font-mono text-sm font-semibold tracking-wide text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-400/50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold text-amber-200/90">Passcode</span>
                      <input
                        value={draft.zoomPasscode ?? ""}
                        onChange={(e) => setDraft({ ...draft, zoomPasscode: e.target.value })}
                        placeholder="If Zoom requires one"
                        className="mt-1 w-full rounded-lg border-2 border-amber-400/50 bg-black/50 px-3 py-2.5 font-mono text-sm font-semibold text-white shadow-inner outline-none placeholder:text-gray-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-400/50"
                      />
                    </label>
                    </div>
                    {draft.zoomMeetingId?.trim() ? (
                      <div className="mt-3 rounded-lg border-2 border-emerald-400/50 bg-black/40 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                          Highlighted on learner dashboard
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-white">
                          {formatZoomMeetingId(draft.zoomMeetingId)}
                        </p>
                        {draft.zoomPasscode?.trim() ? (
                          <p className="mt-1 text-[11px] text-emerald-200/90">
                            Passcode:{" "}
                            <span className="font-mono font-bold text-white">{draft.zoomPasscode}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-amber-100/80">
                        Type the Meeting ID from Zoom — it will appear highlighted for enrolled students.
                      </p>
                    )}
                  </div>
                  {draft.zoomMeetingId?.trim() ? (
                    <p className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-1.5 text-[10px] font-medium text-emerald-100">
                      Click <strong className="text-white">Save program</strong> so learners get this Meeting ID
                      {draft.zoomPasscode?.trim() ? " and passcode" : ""}.
                    </p>
                  ) : resolveZoomJoinUrl(draft) ? (
                    <p className="mt-2 text-[10px] text-emerald-300/90">
                      Learners see Join live on Zoom after enroll. Click Save program to keep this link.
                    </p>
                  ) : (
                    <p className="mt-2 text-[10px] text-amber-200/80">
                      Paste a join URL or enter Meeting ID above, then Save program.
                    </p>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className={activeTab === "basics" ? "space-y-4" : "hidden"}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">URL slug</span>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Subtitle</span>
                <textarea
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Badge</span>
                <input
                  value={draft.badge}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Breadcrumb (one segment per line, 3 lines: Home, parent, current)</span>
                <textarea
                  value={draft.breadcrumb.join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      breadcrumb: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
                />
              </label>
            </div>
            </div>
            <div className={activeTab === "pricing" ? "space-y-4" : "hidden"}>
            <h3 className="text-xs font-semibold text-violet-200">Pricing — before payment (checkout page)</h3>
            <p className="text-[10px] text-gray-600">
              Shown on <span className="text-gray-400">/tutor-led/your-slug</span> with strikethrough list price.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-gray-500">Sale price (₹)</span>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => patchPrices({ price: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">List price (₹, strikethrough)</span>
                <input
                  type="number"
                  value={draft.originalPrice}
                  onChange={(e) => patchPrices({ originalPrice: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Discount badge</span>
                <input
                  value={draft.discount}
                  onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                  placeholder={discountLabel(draft.price, draft.originalPrice) || "31% OFF"}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <div className="md:col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100/90">
                Preview:{" "}
                <strong className="text-white">₹{draft.price.toLocaleString("en-IN")}</strong>{" "}
                <span className="text-gray-500 line-through">₹{draft.originalPrice.toLocaleString("en-IN")}</span>{" "}
                {draft.discount ? (
                  <span className="text-amber-200">{draft.discount}</span>
                ) : null}
              </div>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-violet-200">
              Pricing — after payment (My Learning)
            </h3>
            <p className="text-[10px] text-gray-600">Shown on the enrolled learner dashboard (no strikethrough).</p>
            <label className="block md:col-span-2">
              <span className="text-[11px] text-gray-500">Enrolled price (₹)</span>
              <input
                type="number"
                value={draft.priceAfterPayment ?? draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, priceAfterPayment: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-600">
                Preview: Enrolled · ₹{(draft.priceAfterPayment ?? draft.price).toLocaleString("en-IN")}
              </p>
            </label>
            </div>
            <div className={activeTab === "basics" ? "space-y-4" : "hidden"}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-gray-500">Batch label</span>
                <input
                  value={draft.batchLabel}
                  onChange={(e) => setDraft({ ...draft, batchLabel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.seatsFilling}
                  onChange={(e) => setDraft({ ...draft, seatsFilling: e.target.checked })}
                  className="accent-amber-500"
                />
                Seats filling (urgency strip)
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Seats left</span>
                <input
                  type="number"
                  value={draft.seatsLeft}
                  onChange={(e) => setDraft({ ...draft, seatsLeft: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Next batch date (display)</span>
                <input
                  value={draft.nextBatchDate}
                  onChange={(e) => setDraft({ ...draft, nextBatchDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Schedule</span>
                <input
                  value={draft.schedule}
                  onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Language</span>
                <input
                  value={draft.language}
                  onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["days", "hours", "mins", "secs"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-[11px] text-gray-500">Countdown {k}</span>
                  <input
                    type="number"
                    value={draft.countdown[k]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        countdown: { ...draft.countdown, [k]: Number(e.target.value) || 0 },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                  />
                </label>
              ))}
            </div>
            </div>
            <div className={activeTab === "zoom" ? "space-y-4" : "hidden"} id="zoom-editor-panel">
            <h3 className="text-xs font-semibold text-sky-300">Zoom — live meeting link</h3>
            <AdminModeToggle
              label="Zoom setup"
              value={draft.zoomLinkMode ?? (zoomApiConfigured ? "auto" : "manual")}
              onChange={(id) => setDraft({ ...draft, zoomLinkMode: id as "auto" | "manual" })}
              options={[
                { id: "auto", label: "Automatic (API)" },
                { id: "manual", label: "Manual (paste)" },
              ]}
            />
            {(draft.zoomLinkMode ?? (zoomApiConfigured ? "auto" : "manual")) === "auto" ? (
            <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 p-3">
              <p className="text-[11px] font-semibold text-violet-100">Zoom API</p>
              {zoomApiConfigured ? (
                <>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Create a meeting in your Zoom account and fill the join link below. Cloud recording is{" "}
                    {zoomAutoRecord ? "on" : "off"} for new meetings.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={zoomApiBusy || !draft.slug}
                      onClick={() => void createZoomMeetingViaApi()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D8CFF] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#2681eb] disabled:opacity-50"
                    >
                      {zoomApiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Video className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Create Zoom meeting
                    </button>
                    <button
                      type="button"
                      disabled={zoomApiBusy}
                      onClick={() => void syncZoomRecordingsViaApi()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      Sync cloud recordings
                    </button>
                  </div>
                  {(draft.zoomRecordings?.length ?? 0) > 0 ? (
                    <p className="mt-2 text-[10px] text-emerald-300/90">
                      {draft.zoomRecordings!.length} recording(s) on this course.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-[10px] text-amber-200/90">
                  On{" "}
                  <a
                    href="https://marketplace.zoom.us/develop/create"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 underline"
                  >
                    marketplace.zoom.us → Develop
                  </a>
                  , Zoom shows <strong className="text-amber-100">4 app types</strong>. Choose only{" "}
                  <strong className="text-amber-100">Server-to-Server OAuth</strong> (not General App, SDK, or Webhook
                  Only). Add credentials to <code className="text-amber-100">.env.local</code>, restart the dev server,
                  then use the buttons above. You can still paste a join link manually below.
                </p>
              )}
              {zoomApiMessage ? (
                <p className="mt-2 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] text-gray-200">
                  {zoomApiMessage}
                </p>
              ) : null}
            </div>
            ) : (
              <p className="text-[10px] text-gray-500">Paste the join link below, or switch to Automatic when Zoom API is configured.</p>
            )}
            <ul className="list-inside list-disc space-y-1 text-[10px] text-gray-500">
              {ZOOM_PREMIUM_ADMIN_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Zoom join link (manual)</span>
                <input
                  value={draft.liveJoinUrl ?? ""}
                  onChange={(e) => setDraft(applyZoomPaste(draft, e.target.value))}
                  placeholder="https://zoom.us/j/12345678901?pwd=..."
                  className="mt-1 w-full rounded-lg border border-sky-500/30 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none focus:border-sky-500/50"
                />
              </label>
              <div
                className={`md:col-span-2 rounded-xl border-2 p-3 ${
                  draft.zoomMeetingId?.trim()
                    ? "border-emerald-400/60 bg-emerald-500/10 ring-2 ring-emerald-400/30"
                    : "border-amber-400/50 bg-amber-500/10 ring-2 ring-amber-400/25"
                }`}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Meeting ID & passcode (highlighted for learners)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-amber-200/90">Meeting ID</span>
                    <input
                      value={draft.zoomMeetingId ?? ""}
                      onChange={(e) => setDraft(applyMeetingIdField(draft, e.target.value))}
                      placeholder="e.g. 12345678901"
                      className="mt-1 w-full rounded-lg border-2 border-amber-400/50 bg-black/50 px-3 py-2 font-mono text-sm font-semibold text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/50"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-amber-200/90">Passcode</span>
                    <input
                      value={draft.zoomPasscode ?? ""}
                      onChange={(e) => setDraft({ ...draft, zoomPasscode: e.target.value })}
                      placeholder="Shown to enrolled learners"
                      className="mt-1 w-full rounded-lg border-2 border-amber-400/50 bg-black/50 px-3 py-2 font-mono text-sm font-semibold text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/50"
                    />
                  </label>
                </div>
                {draft.zoomMeetingId?.trim() ? (
                  <p className="mt-2 text-center font-mono text-lg font-bold tracking-widest text-emerald-100">
                    {formatZoomMeetingId(draft.zoomMeetingId)}
                  </p>
                ) : null}
              </div>
              {resolveZoomJoinUrl(draft) ? (
                <div className="md:col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2">
                  <span className="text-[10px] text-sky-200">
                    {isZoomJoinUrl(resolveZoomJoinUrl(draft)!) ? "Zoom link ready" : "Join URL set"}
                  </span>
                  <a
                    href={resolveZoomJoinUrl(draft)!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-sky-300 underline hover:text-white"
                  >
                    Test in Zoom
                  </a>
                </div>
              ) : (
                <p className="md:col-span-2 text-[10px] text-amber-200/90">
                  Add a join link or meeting ID so enrolled learners can open Zoom from My Learning.
                </p>
              )}
            </div>
            </div>
            <div className={activeTab === "trainer" ? "space-y-4" : "hidden"}>
            <h3 className="text-xs font-semibold text-gray-300">Trainer</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-gray-500">Name</span>
                <input
                  value={draft.trainer.name}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, name: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-gray-500">Role</span>
                <input
                  value={draft.trainer.role}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, role: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Experience line</span>
                <input
                  value={draft.trainer.experience}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, experience: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Bio</span>
                <textarea
                  value={draft.trainer.bio}
                  onChange={(e) => setDraft({ ...draft, trainer: { ...draft.trainer, bio: e.target.value } })}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Trainer avatar image URL</span>
                <input
                  value={draft.trainer.avatar ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, trainer: { ...draft.trainer, avatar: e.target.value } })
                  }
                  placeholder="/trainer-avatar.png"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
                />
                <ImagePreview src={draft.trainer.avatar ?? ""} alt={draft.trainer.name} />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/10">
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  {uploadingTrainerAvatar ? "Uploading…" : "Upload trainer photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingTrainerAvatar}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f)
                        void uploadImageField(
                          f,
                          (url) =>
                            setDraft({ ...draft, trainer: { ...draft.trainer, avatar: url } }),
                          setUploadingTrainerAvatar,
                          "Trainer photo upload failed.",
                        );
                    }}
                  />
                </label>
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Certifications (comma-separated)</span>
                <input
                  value={draft.trainer.certifications.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      trainer: {
                        ...draft.trainer,
                        certifications: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] text-gray-500">Worked with (comma-separated)</span>
                <input
                  value={draft.trainer.workedWith.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      trainer: {
                        ...draft.trainer,
                        workedWith: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>
            </div>
            <div className={activeTab === "curriculum" ? "space-y-4" : "hidden"}>
              <AdminTutorLedCurriculumEditor
                draft={draft}
                setDraft={setDraft}
                onUploadImage={async (file, apply) => {
                  await uploadImageField(file, apply, () => {}, "Image upload failed.");
                }}
              />
            </div>
            <div className={activeTab === "media" ? "space-y-4" : "hidden"}>
              <AdminTutorLedMediaPanel
                draft={draft}
                setDraft={setDraft}
                uploadingHero={uploadingHero}
                uploadingLearnerHero={uploadingLearnerHero}
                uploadingTrainerAvatar={uploadingTrainerAvatar}
                onUploadHero={(file) =>
                  void uploadImageField(
                    file,
                    (url) => setDraft({ ...draft, heroSrc: url }),
                    setUploadingHero,
                    "Hero image upload failed.",
                  )
                }
                onUploadLearnerHero={(file) =>
                  void uploadImageField(
                    file,
                    (url) => setDraft({ ...draft, learnerHeroSrc: url }),
                    setUploadingLearnerHero,
                    "Learner banner upload failed.",
                  )
                }
                onUploadTrainerAvatar={(file) =>
                  void uploadImageField(
                    file,
                    (url) =>
                      setDraft({ ...draft, trainer: { ...draft.trainer, avatar: url } }),
                    setUploadingTrainerAvatar,
                    "Trainer photo upload failed.",
                  )
                }
              />
            </div>
            <div className={activeTab === "marketing" ? "space-y-4" : "hidden"}>
            <h3 className="text-xs font-semibold text-gray-300">Batch detail rows</h3>
            <div className="space-y-2">
              {draft.batchDetails.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.batchDetails];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, batchDetails: next });
                  })}
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...draft.batchDetails];
                      next[i] = { ...next[i], label: e.target.value };
                      setDraft({ ...draft, batchDetails: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Label"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => {
                      const next = [...draft.batchDetails];
                      next[i] = { ...next[i], value: e.target.value };
                      setDraft({ ...draft, batchDetails: next });
                    }}
                    className="min-w-[160px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        batchDetails: draft.batchDetails.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    batchDetails: [...draft.batchDetails, { icon: "Clock", label: "", value: "" }],
                  })
                }
              >
                + Add batch row
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Hero feature strip</h3>
            <div className="space-y-2">
              {draft.features.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.features];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, features: next });
                  })}
                  <input
                    value={row.title}
                    onChange={(e) => {
                      const next = [...draft.features];
                      next[i] = { ...next[i], title: e.target.value };
                      setDraft({ ...draft, features: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Title"
                  />
                  <input
                    value={row.desc}
                    onChange={(e) => {
                      const next = [...draft.features];
                      next[i] = { ...next[i], desc: e.target.value };
                      setDraft({ ...draft, features: next });
                    }}
                    className="min-w-[180px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Description"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, features: draft.features.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    features: [...draft.features, { icon: "Video", title: "", desc: "" }],
                  })
                }
              >
                + Add feature
              </button>
            </div>

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Highlights (one per line)</h3>
            <textarea
              value={draft.highlights.join("\n")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  highlights: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={6}
              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] outline-none"
            />

            <h3 className="border-t border-white/10 pt-3 text-xs font-semibold text-gray-300">Why choose (cards)</h3>
            <div className="space-y-2">
              {draft.whyChoose.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  {iconSelect(row.icon, (v) => {
                    const next = [...draft.whyChoose];
                    next[i] = { ...next[i], icon: v };
                    setDraft({ ...draft, whyChoose: next });
                  })}
                  <input
                    value={row.title}
                    onChange={(e) => {
                      const next = [...draft.whyChoose];
                      next[i] = { ...next[i], title: e.target.value };
                      setDraft({ ...draft, whyChoose: next });
                    }}
                    className="min-w-[120px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                  />
                  <input
                    value={row.desc}
                    onChange={(e) => {
                      const next = [...draft.whyChoose];
                      next[i] = { ...next[i], desc: e.target.value };
                      setDraft({ ...draft, whyChoose: next });
                    }}
                    className="min-w-[160px] flex-[2] rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, whyChoose: draft.whyChoose.filter((_, j) => j !== i) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() =>
                  setDraft({
                    ...draft,
                    whyChoose: [...draft.whyChoose, { icon: "Star", title: "", desc: "" }],
                  })
                }
              >
                + Add card
              </button>
            </div>

            </div>
            <div className={activeTab === "downloads" ? "space-y-4" : "hidden"}>
            <h3 className="text-xs font-semibold text-gray-300">Learning materials (Pad notes, PPT, Webbook)</h3>
            <p className="text-[11px] text-gray-500">
              Upload files here. Learners only see a <strong className="text-gray-400">Download</strong> button on My
              Learning — they cannot add or upload.
            </p>
            <div className="space-y-4">
              {LEARNING_TOOL_KINDS.map((kind) => {
                const meta = TUTOR_LED_TOOL_META[kind];
                const items = (draft.learningMaterials ?? []).filter((m) => m.kind === kind);
                return (
                  <div key={kind} className="rounded-lg border border-violet-500/20 bg-black/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white">{meta.label}</p>
                        <p className="text-[10px] text-gray-500">{meta.description}</p>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-violet-300 hover:text-violet-200"
                        onClick={() => addLearningMaterial(kind)}
                      >
                        + Add {meta.shortLabel}
                      </button>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-2 text-[10px] text-gray-600">No files yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="grid gap-2 rounded-lg border border-white/10 bg-black/40 p-2 sm:grid-cols-[1fr_auto]"
                          >
                            <div className="space-y-2">
                              <input
                                value={item.title}
                                onChange={(e) => updateLearningMaterial(item.id, { title: e.target.value })}
                                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                                placeholder="Display name for learners"
                              />
                              <input
                                value={item.downloadUrl}
                                onChange={(e) =>
                                  updateLearningMaterial(item.id, { downloadUrl: e.target.value })
                                }
                                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] outline-none"
                                placeholder="File URL (filled automatically after upload)"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/20">
                                <Upload className="h-3.5 w-3.5" aria-hidden />
                                {uploadingMaterialId === item.id ? "Uploading…" : "Upload file"}
                                <input
                                  type="file"
                                  accept={ACCEPT_BY_KIND[kind]}
                                  className="sr-only"
                                  disabled={uploadingMaterialId === item.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    if (f) void uploadLearningMaterial(item.id, f);
                                  }}
                                />
                              </label>
                              {item.downloadUrl ? (
                                <a
                                  href={item.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-emerald-300 underline"
                                >
                                  Preview
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="text-[11px] text-red-300"
                                onClick={() => removeLearningMaterial(item.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            <div className={activeTab === "faqs" ? "space-y-4" : "hidden"}>
            <h3 className="text-xs font-semibold text-gray-300">FAQs</h3>
            <div className="space-y-2">
              {draft.faqs.map((faq, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  <input
                    value={faq.q}
                    onChange={(e) => {
                      const next = [...draft.faqs];
                      next[i] = { ...next[i], q: e.target.value };
                      setDraft({ ...draft, faqs: next });
                    }}
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Question"
                  />
                  <textarea
                    value={faq.a}
                    onChange={(e) => {
                      const next = [...draft.faqs];
                      next[i] = { ...next[i], a: e.target.value };
                      setDraft({ ...draft, faqs: next });
                    }}
                    rows={2}
                    className="resize-y rounded border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
                    placeholder="Answer"
                  />
                  <button
                    type="button"
                    className="text-left text-[11px] text-red-300"
                    onClick={() => setDraft({ ...draft, faqs: draft.faqs.filter((_, j) => j !== i) })}
                  >
                    Remove FAQ
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-violet-300"
                onClick={() => setDraft({ ...draft, faqs: [...draft.faqs, { q: "", a: "" }] })}
              >
                + Add FAQ
              </button>
            </div>
            </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0d1528] p-4">
                <p className="text-[10px] text-gray-500">
                  {EDITOR_TABS.find((t) => t.id === activeTab)?.label} · {materialCount(draft)} files
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveDraft()}
                    className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save program"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setIsCreating(false);
                    }}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400 hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
