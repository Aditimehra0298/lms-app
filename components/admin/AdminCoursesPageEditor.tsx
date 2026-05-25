"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  Eye,
  FlipHorizontal2,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Plus,
  Rocket,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  AdminContent,
  CoursesPageConfig,
  CoursesPageCta,
  CoursesPageExpert,
  CoursesPageHero,
  CoursesPageTutorLed,
  CoursesPageRecentUpdate,
  CoursesPageUpcoming,
} from "@/lib/content-schema";
import { defaultCoursesPageConfig } from "@/lib/content-schema";
import Link from "next/link";

type SectionKey =
  | "hero"
  | "tutorLed"
  | "recentUpdates"
  | "upcoming"
  | "featured"
  | "faqs"
  | "cta"
  | "display";

const sectionMeta: Record<SectionKey, { label: string; icon: typeof Rocket; color: string }> = {
  hero: { label: "Hero Section", icon: Rocket, color: "#f59e0b" },
  tutorLed: { label: "Tutor-Led Sessions", icon: Zap, color: "#3b82f6" },
  recentUpdates: { label: "Recent Updates", icon: Layers, color: "#8b5cf6" },
  upcoming: { label: "Upcoming (Future)", icon: Globe, color: "#10b981" },
  featured: { label: "Featured Courses", icon: Sparkles, color: "#f59e0b" },
  faqs: { label: "FAQ Section", icon: MessageCircleQuestion, color: "#6366f1" },
  cta: { label: "CTA / Ready to Start", icon: Users, color: "#ec4899" },
  display: { label: "Display Settings", icon: Settings2, color: "#64748b" },
};

const iconColorOptions: CoursesPageUpcoming["iconColor"][] = [
  "rose", "sky", "violet", "emerald", "amber", "blue",
];
const iconColorMap: Record<string, string> = {
  rose: "#f43f5e", sky: "#0ea5e9", violet: "#8b5cf6",
  emerald: "#10b981", amber: "#f59e0b", blue: "#3b82f6",
};

/* ─── Canvas crop export (react-easy-crop gives pixel area) ─── */
function getCroppedBlob(src: string, pixelCrop: Area, flip = { h: false, v: false }, rotation = 0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        const rad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const bW = img.naturalWidth * cos + img.naturalHeight * sin;
        const bH = img.naturalWidth * sin + img.naturalHeight * cos;

        canvas.width = bW;
        canvas.height = bH;
        ctx.translate(bW / 2, bH / 2);
        ctx.rotate(rad);
        ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const out = document.createElement("canvas");
        out.width = pixelCrop.width;
        out.height = pixelCrop.height;
        const outCtx = out.getContext("2d")!;
        outCtx.imageSmoothingQuality = "high";
        outCtx.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

        out.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.92);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

/* ─── Aspect presets ─── */
const ASPECT_PRESETS = [
  { label: "Free", value: 0, icon: Unlock },
  { label: "1:1", value: 1, icon: Lock },
  { label: "16:9", value: 16 / 9, icon: Lock },
  { label: "4:3", value: 4 / 3, icon: Lock },
  { label: "3:2", value: 3 / 2, icon: Lock },
  { label: "9:16", value: 9 / 16, icon: Lock },
];

/* ─── Futuristic CropModal powered by react-easy-crop ─── */
function CropModal({
  src,
  aspect: initialAspect,
  onCrop,
  onCancel,
}: {
  src: string;
  aspect?: number;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [ar, setAr] = useState(initialAspect ?? 4 / 3);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const [cropError, setCropError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const handleApply = async () => {
    if (!croppedArea) return;
    setCropError(null);
    setApplying(true);
    try {
      const blob = await getCroppedBlob(src, croppedArea, { h: flipH, v: false }, rotation);
      onCrop(blob);
    } catch (e) { setCropError(e instanceof Error ? e.message : "Crop failed — try again"); setApplying(false); }
  };

  const resetAll = () => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setFlipH(false); };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4" onClick={onCancel}>
      <div className="relative flex w-full max-w-4xl flex-col rounded-3xl border border-white/8 bg-[#070b14] shadow-[0_0_100px_rgba(245,158,11,0.08),0_32px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "92vh" }}>

        {/* ── Neon accent line ── */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#f59e0b]/60 to-transparent" />

        {/* ── Header - fixed ── */}
        <div className="relative flex shrink-0 items-center justify-between px-6 py-4">
          <div className="absolute inset-0 bg-linear-to-b from-[#f59e0b]/4 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#f59e0b]/25 to-[#f59e0b]/5 ring-1 ring-[#f59e0b]/20">
              <Crop size={16} className="text-[#f59e0b]" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Image Studio</h2>
              <p className="text-[10px] text-gray-500">Crop, rotate & transform</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="relative rounded-xl p-2 text-gray-500 ring-1 ring-white/5 transition hover:bg-white/5 hover:text-white hover:ring-white/15"><X size={16} /></button>
        </div>

        {/* ── Scrollable middle ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-black/80 ring-1 ring-white/5" style={{ height: "clamp(200px, 45vh, 500px)" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ar || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid={showGrid}
            cropShape={ar === 1 && initialAspect === 1 ? "round" : "rect"}
            objectFit="contain"
            style={{
              containerStyle: { borderRadius: "1rem", background: "#05080f" },
              mediaStyle: { transform: flipH ? "scaleX(-1)" : undefined },
              cropAreaStyle: {
                border: "2px solid rgba(245, 158, 11, 0.7)",
                boxShadow: "0 0 30px rgba(245, 158, 11, 0.15), inset 0 0 30px rgba(245, 158, 11, 0.05)",
              },
            }}
          />
          {/* Floating zoom badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[10px] font-medium text-[#f59e0b] ring-1 ring-[#f59e0b]/20 backdrop-blur-md">
            <ZoomIn size={10} />
            {Math.round(zoom * 100)}%
          </div>
          {rotation !== 0 && (
            <div className="absolute bottom-3 left-24 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[10px] font-medium text-blue-400 ring-1 ring-blue-400/20 backdrop-blur-md">
              <RotateCw size={10} />
              {rotation}°
            </div>
          )}
        </div>

        {/* ── Controls panel ── */}
        <div className="mt-3 space-y-3">
          {/* Aspect ratio row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Ratio</span>
            <div className="flex flex-1 items-center gap-1 rounded-xl bg-white/3 p-1 ring-1 ring-white/5">
              {ASPECT_PRESETS.map((p) => {
                const active = ar === 0 ? p.value === 0 : Math.abs(ar - p.value) < 0.01;
                return (
                  <button key={p.label} type="button" onClick={() => setAr(p.value)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all ${active
                      ? "bg-linear-to-r from-[#f59e0b] to-[#d97706] text-black shadow-lg shadow-amber-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Zoom</span>
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5">
              <ZoomOut size={12} className="shrink-0 text-gray-500" />
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#f59e0b] h-1 cursor-pointer [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f59e0b] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <ZoomIn size={12} className="shrink-0 text-gray-500" />
              <span className="ml-1 min-w-[3ch] text-right text-[11px] font-mono text-[#f59e0b]">{zoom.toFixed(1)}x</span>
            </div>
          </div>

          {/* Rotation slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Rotate</span>
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5">
              <RotateCcw size={12} className="shrink-0 text-gray-500" />
              <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-[#6366f1] h-1 cursor-pointer [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6366f1] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <RotateCw size={12} className="shrink-0 text-gray-500" />
              <span className="ml-1 min-w-[4ch] text-right text-[11px] font-mono text-[#818cf8]">{rotation}°</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Tools</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setFlipH(!flipH)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ring-1 transition ${flipH ? "bg-[#f59e0b]/15 text-[#f59e0b] ring-[#f59e0b]/30" : "text-gray-400 ring-white/5 hover:bg-white/5 hover:text-white"}`}>
                <FlipHorizontal2 size={12} /> Flip
              </button>
              <button type="button" onClick={() => setRotation((r) => r - 90)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 hover:text-white transition">
                <RotateCcw size={12} /> -90°
              </button>
              <button type="button" onClick={() => setRotation((r) => r + 90)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 hover:text-white transition">
                <RotateCw size={12} /> +90°
              </button>
              <button type="button" onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ring-1 transition ${showGrid ? "bg-white/8 text-white ring-white/15" : "text-gray-500 ring-white/5 hover:bg-white/5"}`}>
                Grid
              </button>
              <button type="button" onClick={resetAll}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 hover:text-white transition">
                <RotateCcw size={12} /> Reset All
              </button>
            </div>
          </div>
        </div>
        </div>{/* close scrollable middle */}

        {/* ── Footer - always visible ── */}
        <div className="relative flex shrink-0 items-center justify-between border-t border-white/5 px-6 py-5">
          <div className="absolute inset-0 bg-linear-to-t from-[#f59e0b]/3 to-transparent" />
          <div className="relative">{cropError && <p className="text-xs font-medium text-red-400">{cropError}</p>}{!cropError && <p className="text-[10px] text-gray-600">Drag to pan &middot; Scroll to zoom</p>}</div>
          <div className="relative flex items-center gap-3">
            <button type="button" onClick={onCancel}
              className="rounded-xl px-5 py-3 text-sm font-medium text-gray-400 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={handleApply} disabled={applying}
              className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#22c55e] to-[#16a34a] px-8 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(34,197,94,0.35)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all">
              {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {applying ? "Processing..." : "Done"}
            </button>
          </div>
        </div>

        {/* ── Bottom neon line ── */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#f59e0b]/30 to-transparent" />
      </div>
    </div>
  );
}

/* ─── ImageUploader with crop support ─── */
function ImageUploader({
  value,
  onChange,
  label,
  compact,
  aspect,
  cropEnabled = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  compact?: boolean;
  aspect?: number;
  cropEnabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => { if (value) setPreview(value); }, [value]);

  const handleFile = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (cropEnabled) setCropSrc(dataUrl); else doUpload(file);
    };
    reader.readAsDataURL(file);
  };

  const doUpload = async (fileOrBlob: File | Blob) => {
    setUploading(true);
    setUploadError(null);
    const localPreview = URL.createObjectURL(fileOrBlob);
    setPreview(localPreview);
    try {
      const form = new FormData();
      const name = fileOrBlob instanceof File ? fileOrBlob.name : "cropped.jpg";
      form.append("file", new File([fileOrBlob], name, { type: fileOrBlob.type || "image/jpeg" }));
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        onChange(url);
        setPreview(url);
      } else {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }));
        setUploadError(errData.error || "Upload failed");
        onChange(localPreview);
      }
    } catch {
      setUploadError("Network error during upload");
      onChange(localPreview);
    } finally { setUploading(false); }
  };

  const onCropDone = async (blob: Blob) => {
    setCropSrc(null);
    await doUpload(blob);
  };

  const h = compact ? "h-20" : "h-32";

  return (
    <>
      <div className="space-y-1.5">
        {label && <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</label>}
        <div className={`group relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-linear-to-br from-white/3 to-transparent ${h} transition-all hover:border-[#f59e0b]/40`}>
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" onError={() => setPreview("")} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-500">
              <ImageIcon size={compact ? 18 : 24} />
              <span className="text-[10px]">No image</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => { setMode("upload"); fileRef.current?.click(); }}
              className="flex items-center gap-1 rounded-lg bg-[#f59e0b] px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg transition hover:bg-[#e5a32f]">
              <Upload size={12} /> {compact ? "Photo" : "Upload & Crop"}
            </button>
            {!compact && <button type="button" onClick={() => setMode("url")}
              className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur transition hover:bg-white/20">
              <Globe size={12} /> URL
            </button>}
          </div>
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-black/70">
              <Loader2 size={20} className="animate-spin text-[#f59e0b]" />
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {!compact && mode === "url" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5">
            <Globe size={12} className="shrink-0 text-gray-500" />
            <input className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600" placeholder="Paste image URL..."
              value={value} onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }} />
          </div>
        )}
        {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
        {preview && compact && <button type="button" onClick={() => { onChange(""); setPreview(""); }} className="text-[9px] text-red-400/70 hover:text-red-400">Remove</button>}
      </div>
      {cropSrc && <CropModal src={cropSrc} aspect={aspect} onCrop={onCropDone} onCancel={() => setCropSrc(null)} />}
    </>
  );
}

function ColorDot({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 w-6 rounded-full border-2 transition-all ${active ? "border-white scale-110 shadow-[0_0_12px_var(--glow)]" : "border-transparent hover:border-white/30"}`}
      style={{ backgroundColor: color, "--glow": `${color}88` } as React.CSSProperties}
    />
  );
}

export default function AdminCoursesPageEditor() {
  const [config, setConfig] = useState<CoursesPageConfig>(defaultCoursesPageConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    hero: true, tutorLed: false, recentUpdates: false, upcoming: false,
    featured: false, faqs: false, cta: false, display: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as AdminContent;
          if (data.coursesPage) setConfig({ ...defaultCoursesPageConfig, ...data.coursesPage });
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) return;
      const current = (await res.json()) as AdminContent;
      await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, coursesPage: config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* keep UI usable */ } finally { setSaving(false); }
  };

  const toggle = (key: SectionKey) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const updateHero = (patch: Partial<CoursesPageHero>) => setConfig((p) => ({ ...p, hero: { ...p.hero, ...patch } }));
  const updateCta = (patch: Partial<CoursesPageCta>) => setConfig((p) => ({ ...p, cta: { ...p.cta, ...patch } }));

  const setTutorLed = (idx: number, patch: Partial<CoursesPageTutorLed>) =>
    setConfig((p) => ({ ...p, tutorLed: p.tutorLed.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));
  const addTutorLed = () =>
    setConfig((p) => ({ ...p, tutorLed: [...p.tutorLed, { date: "JUN 01", title: "New Session", time: "10:00 AM - 11:00 AM" }] }));
  const removeTutorLed = (idx: number) =>
    setConfig((p) => ({ ...p, tutorLed: p.tutorLed.filter((_, i) => i !== idx) }));

  const setRecentUpdate = (idx: number, patch: Partial<CoursesPageRecentUpdate>) =>
    setConfig((p) => ({ ...p, recentUpdates: p.recentUpdates.map((u, i) => (i === idx ? { ...u, ...patch } : u)) }));
  const addRecentUpdate = () =>
    setConfig((p) => ({ ...p, recentUpdates: [...p.recentUpdates, { title: "New Update", subtitle: "Related Course", href: "/courses", image: "/p1.png" }] }));
  const removeRecentUpdate = (idx: number) =>
    setConfig((p) => ({ ...p, recentUpdates: p.recentUpdates.filter((_, i) => i !== idx) }));

  const setUpcoming = (idx: number, patch: Partial<CoursesPageUpcoming>) =>
    setConfig((p) => ({ ...p, upcomingItems: p.upcomingItems.map((u, i) => (i === idx ? { ...u, ...patch } : u)) }));
  const addUpcoming = () =>
    setConfig((p) => ({ ...p, upcomingItems: [...p.upcomingItems, { title: "New Event", time: "TBD", iconColor: "amber" }] }));
  const removeUpcoming = (idx: number) =>
    setConfig((p) => ({ ...p, upcomingItems: p.upcomingItems.filter((_, i) => i !== idx) }));

  const setExpert = (idx: number, patch: Partial<CoursesPageExpert>) =>
    setConfig((p) => ({ ...p, featuredExperts: p.featuredExperts.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));
  const addExpert = () =>
    setConfig((p) => ({ ...p, featuredExperts: [...p.featuredExperts, { name: "New Expert", photo: "" }] }));
  const removeExpert = (idx: number) =>
    setConfig((p) => ({ ...p, featuredExperts: p.featuredExperts.filter((_, i) => i !== idx) }));

  const setFaq = (idx: number, q: string) =>
    setConfig((p) => ({ ...p, faqs: p.faqs.map((f, i) => (i === idx ? { question: q } : f)) }));
  const addFaq = () => setConfig((p) => ({ ...p, faqs: [...p.faqs, { question: "New question?" }] }));
  const removeFaq = (idx: number) => setConfig((p) => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60 focus:shadow-[0_0_16px_rgba(245,158,11,0.12)]";
  const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";

  const SectionHeader = ({ sectionKey }: { sectionKey: SectionKey }) => {
    const meta = sectionMeta[sectionKey];
    const Icon = meta.icon;
    const isOpen = expanded[sectionKey];
    return (
      <button
        type="button"
        onClick={() => toggle(sectionKey)}
        className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white/3"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
        >
          <Icon size={16} />
        </div>
        <span className="flex-1 text-sm font-semibold">{meta.label}</span>
        <div className={`rounded-md p-1 transition ${isOpen ? "bg-white/10" : "bg-white/5"}`}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
    );
  };

  const cardCls = "rounded-2xl border border-white/[0.07] bg-linear-to-br from-[#0d1528] via-[#0b1224] to-[#0a0f1e] p-5 shadow-[0_4px_32px_rgba(0,0,0,0.3)]";
  const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3 backdrop-blur-sm transition-all hover:border-white/15";
  const btnAdd = "inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-linear-to-r from-white/[0.02] to-transparent px-4 py-2.5 text-xs text-gray-300 transition hover:border-[#f59e0b]/40 hover:text-[#f59e0b]";
  const btnDanger = "inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300";

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-linear-to-r from-[#0d1528] via-[#12182e] to-[#0d1528] p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#6366f1]/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#f59e0b] to-[#d97706] shadow-lg shadow-amber-500/20">
              <LayoutDashboard size={22} className="text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Courses Page Editor</h1>
              <p className="text-xs text-gray-400">
                Manage hero, sessions, updates, FAQ, CTA and display settings for <code className="rounded bg-white/5 px-1 text-[10px] text-[#f59e0b]">/courses</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/courses"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium transition hover:bg-white/10"
            >
              <Eye size={13} /> Preview
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/25 transition hover:shadow-amber-500/40 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Hero Section ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="hero" />
        {expanded.hero && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Badge Text</label>
                    <input className={inputCls} value={config.hero.badgeText} onChange={(e) => updateHero({ badgeText: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Highlight Word</label>
                    <input className={inputCls} value={config.hero.highlightWord} onChange={(e) => updateHero({ highlightWord: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Title (use &#123;highlight&#125; for colored word)</label>
                  <input className={inputCls} value={config.hero.title} onChange={(e) => updateHero({ title: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Subtitle</label>
                  <textarea className={inputCls} rows={2} value={config.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Primary CTA</label>
                    <input className={inputCls} value={config.hero.ctaPrimary} onChange={(e) => updateHero({ ctaPrimary: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Secondary CTA</label>
                    <input className={inputCls} value={config.hero.ctaSecondary} onChange={(e) => updateHero({ ctaSecondary: e.target.value })} />
                  </div>
                </div>
              </div>
              <ImageUploader
                label="Hero Background"
                value={config.hero.backgroundImage}
                onChange={(v) => updateHero({ backgroundImage: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tutor-Led Sessions ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="tutorLed" />
        {expanded.tutorLed && (
          <div className="mt-4 space-y-3">
            {config.tutorLed.map((session, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${itemCls}`}>
                <GripVertical size={14} className="mt-2.5 shrink-0 text-gray-600 cursor-grab" />
                <div className="grid flex-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input className={inputCls} value={session.date} onChange={(e) => setTutorLed(idx, { date: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input className={inputCls} value={session.title} onChange={(e) => setTutorLed(idx, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <input className={inputCls} value={session.time} onChange={(e) => setTutorLed(idx, { time: e.target.value })} />
                  </div>
                </div>
                <button type="button" onClick={() => removeTutorLed(idx)} className={btnDanger}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={addTutorLed} className={btnAdd}><Plus size={14} /> Add Session</button>
          </div>
        )}
      </div>

      {/* ── Recent Updates ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="recentUpdates" />
        {expanded.recentUpdates && (
          <div className="mt-4 space-y-3">
            {config.recentUpdates.map((update, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${itemCls}`}>
                <GripVertical size={14} className="mt-2.5 shrink-0 text-gray-600 cursor-grab" />
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_140px]">
                  <div className="space-y-2">
                    <div>
                      <label className={labelCls}>Title</label>
                      <input className={inputCls} value={update.title} onChange={(e) => setRecentUpdate(idx, { title: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Subtitle</label>
                      <input className={inputCls} value={update.subtitle} onChange={(e) => setRecentUpdate(idx, { subtitle: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Link (href)</label>
                    <input className={inputCls} value={update.href} onChange={(e) => setRecentUpdate(idx, { href: e.target.value })} />
                  </div>
                  <ImageUploader
                    label="Poster"
                    value={update.image}
                    onChange={(v) => setRecentUpdate(idx, { image: v })}
                    compact
                  />
                </div>
                <button type="button" onClick={() => removeRecentUpdate(idx)} className={btnDanger}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={addRecentUpdate} className={btnAdd}><Plus size={14} /> Add Update</button>
          </div>
        )}
      </div>

      {/* ── Upcoming (Future) ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="upcoming" />
        {expanded.upcoming && (
          <div className="mt-4 space-y-3">
            {config.upcomingItems.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${itemCls}`}>
                <GripVertical size={14} className="mt-2.5 shrink-0 text-gray-600 cursor-grab" />
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className={labelCls}>Title</label>
                    <input className={inputCls} value={item.title} onChange={(e) => setUpcoming(idx, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <input className={inputCls} value={item.time} onChange={(e) => setUpcoming(idx, { time: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Icon Color</label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 p-1.5">
                      {iconColorOptions.map((c) => (
                        <ColorDot
                          key={c}
                          color={iconColorMap[c]}
                          active={item.iconColor === c}
                          onClick={() => setUpcoming(idx, { iconColor: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => removeUpcoming(idx)} className={btnDanger}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={addUpcoming} className={btnAdd}><Plus size={14} /> Add Upcoming Item</button>
          </div>
        )}
      </div>

      {/* ── Featured Courses ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="featured" />
        {expanded.featured && (
          <div className="mt-4 space-y-5">
            <div>
              <label className={labelCls}>Featured Description</label>
              <textarea className={inputCls} rows={4} value={config.featuredDescription} onChange={(e) => setConfig((p) => ({ ...p, featuredDescription: e.target.value }))} />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-300">Expert Profiles</p>
                <span className="rounded-md bg-[#f59e0b]/15 px-2 py-0.5 text-[10px] font-medium text-[#f59e0b]">{config.featuredExperts.length} experts</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {config.featuredExperts.map((expert, idx) => (
                  <div key={idx} className={`flex items-start gap-3 ${itemCls}`}>
                    <div className="w-20 shrink-0">
                      <ImageUploader
                        value={expert.photo}
                        onChange={(v) => setExpert(idx, { photo: v })}
                        compact
                        aspect={1}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5 pt-1">
                      <input
                        className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-[#f59e0b]/50"
                        placeholder="Expert name"
                        value={expert.name}
                        onChange={(e) => setExpert(idx, { name: e.target.value })}
                      />
                      <p className="text-[10px] text-gray-500">Hover photo to upload & crop, or paste URL</p>
                    </div>
                    <button type="button" onClick={() => removeExpert(idx)} className={`${btnDanger} mt-1`}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addExpert} className={`${btnAdd} mt-3`}><Plus size={14} /> Add Expert</button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAQs ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="faqs" />
        {expanded.faqs && (
          <div className="mt-4 space-y-2">
            {config.faqs.map((faq, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#6366f1]/20 text-[10px] font-bold text-[#a5b4fc]">{idx + 1}</span>
                <input className={`${inputCls} flex-1`} value={faq.question} onChange={(e) => setFaq(idx, e.target.value)} />
                <button type="button" onClick={() => removeFaq(idx)} className={btnDanger}><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={addFaq} className={btnAdd}><Plus size={14} /> Add FAQ</button>
          </div>
        )}
      </div>

      {/* ── CTA Section ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="cta" />
        {expanded.cta && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Heading</label>
                <input className={inputCls} value={config.cta.heading} onChange={(e) => updateCta({ heading: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls} rows={2} value={config.cta.description} onChange={(e) => updateCta({ description: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Button Text</label>
                <input className={inputCls} value={config.cta.buttonText} onChange={(e) => updateCta({ buttonText: e.target.value })} />
              </div>
            </div>
            <ImageUploader
              label="CTA Image"
              value={config.cta.image}
              onChange={(v) => updateCta({ image: v })}
            />
          </div>
        )}
      </div>

      {/* ── Display Settings ── */}
      <div className={cardCls}>
        <SectionHeader sectionKey="display" />
        {expanded.display && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Courses Per Row</label>
              <input type="number" min={1} max={8} className={inputCls} value={config.coursesPerRow} onChange={(e) => setConfig((p) => ({ ...p, coursesPerRow: Number(e.target.value) || 5 }))} />
            </div>
            <div>
              <label className={labelCls}>Default Visible Courses</label>
              <input type="number" min={1} max={50} className={inputCls} value={config.defaultVisibleCourses} onChange={(e) => setConfig((p) => ({ ...p, defaultVisibleCourses: Number(e.target.value) || 5 }))} />
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Save Bar ── */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-8 py-3 text-sm font-bold text-black shadow-[0_8px_32px_rgba(245,158,11,0.35)] transition-all hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : saved ? "All Changes Saved" : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}
