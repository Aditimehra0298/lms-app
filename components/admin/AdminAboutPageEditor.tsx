"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Award,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  Eye,
  FlipHorizontal2,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Info,
  Loader2,
  MessageSquare, 
  Plus,
  Rocket,
  RotateCcw,
  RotateCw,
  Save,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  AboutPageAccreditation,
  AboutPageConfig,
  AboutPageCta,
  AboutPageFeature,
  AboutPageHero,
  AboutPageHighlight,
  AboutPageMission,
  AboutPagePillar,
  AboutPageTeamLevel,
  AboutPageTeamMember,
  AboutPageWhoWeAre,
  AdminContent,
} from "@/lib/content-schema";
import { defaultAboutPageConfig } from "@/lib/content-schema";
import Link from "next/link";

/* ─── Canvas crop export ─── */
function getCroppedBlob(src: string, pixelCrop: Area, flip = { h: false }, rotation = 0): Promise<Blob> {
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
        canvas.width = bW; canvas.height = bH;
        ctx.translate(bW / 2, bH / 2); ctx.rotate(rad); ctx.scale(flip.h ? -1 : 1, 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        const out = document.createElement("canvas");
        out.width = pixelCrop.width; out.height = pixelCrop.height;
        const o = out.getContext("2d")!;
        o.imageSmoothingQuality = "high";
        o.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        out.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.92);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

const ASPECT_PRESETS = [
  { label: "Free", value: 0 }, { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 }, { label: "4:3", value: 4 / 3 },
];

function CropModal({ src, aspect: initAr, onCrop, onCancel }: { src: string; aspect?: number; onCrop: (b: Blob) => void; onCancel: () => void }) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [ar, setAr] = useState(initAr ?? 4 / 3);
  const [area, setArea] = useState<Area | null>(null);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);
  const [cropError, setCropError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const apply = async () => {
    if (!area) return;
    setCropError(null);
    setApplying(true);
    try { onCrop(await getCroppedBlob(src, area, { h: flipH }, rotation)); }
    catch (e) { setCropError(e instanceof Error ? e.message : "Crop failed — try again"); setApplying(false); }
  };
  const reset = () => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setFlipH(false); };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4" onClick={onCancel}>
      <div className="relative flex w-full max-w-4xl flex-col rounded-3xl border border-white/8 bg-[#070b14] shadow-[0_0_100px_rgba(245,158,11,0.08),0_32px_80px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#f59e0b]/60 to-transparent" />
        {/* Header - fixed */}
        <div className="relative flex shrink-0 items-center justify-between px-6 py-4">
          <div className="absolute inset-0 bg-linear-to-b from-[#f59e0b]/4 to-transparent" />
          <div className="relative flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#f59e0b]/25 to-[#f59e0b]/5 ring-1 ring-[#f59e0b]/20"><Crop size={16} className="text-[#f59e0b]" /></div><div><h2 className="text-sm font-bold">Image Studio</h2><p className="text-[10px] text-gray-500">Crop, rotate & transform</p></div></div>
          <div className="relative flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5">
              {ASPECT_PRESETS.map((p) => { const active = ar === 0 ? p.value === 0 : Math.abs(ar - p.value) < 0.01; return (<button key={p.label} type="button" onClick={() => setAr(p.value)} className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${active ? "bg-[#f59e0b] text-black shadow" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>{p.label}</button>); })}
            </div>
            <button type="button" onClick={onCancel} className="rounded-xl p-2 text-gray-500 ring-1 ring-white/5 hover:bg-white/5 hover:text-white transition"><X size={16} /></button>
          </div>
        </div>
        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="relative overflow-hidden rounded-2xl bg-black/80 ring-1 ring-white/5" style={{ height: "clamp(200px, 45vh, 500px)" }}>
            <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={ar || undefined} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onComplete} showGrid objectFit="contain" style={{ containerStyle: { borderRadius: "1rem", background: "#05080f" }, mediaStyle: { transform: flipH ? "scaleX(-1)" : undefined }, cropAreaStyle: { border: "2px solid rgba(245,158,11,0.7)", boxShadow: "0 0 30px rgba(245,158,11,0.15)" } }} />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Zoom</span><div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5"><ZoomOut size={12} className="text-gray-500" /><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#f59e0b] h-1 cursor-pointer" /><ZoomIn size={12} className="text-gray-500" /><span className="ml-1 min-w-[3ch] text-right text-[11px] font-mono text-[#f59e0b]">{zoom.toFixed(1)}x</span></div></div>
            <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Rotate</span><div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5"><RotateCcw size={12} className="text-gray-500" /><input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1 accent-[#6366f1] h-1 cursor-pointer" /><RotateCw size={12} className="text-gray-500" /><span className="ml-1 min-w-[4ch] text-right text-[11px] font-mono text-[#818cf8]">{rotation}°</span></div></div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Tools</span><div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setFlipH(!flipH)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ring-1 transition ${flipH ? "bg-[#f59e0b]/15 text-[#f59e0b] ring-[#f59e0b]/30" : "text-gray-400 ring-white/5 hover:bg-white/5"}`}><FlipHorizontal2 size={12} /> Flip</button>
              <button type="button" onClick={() => setRotation((r) => r - 90)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCcw size={12} /> -90°</button>
              <button type="button" onClick={() => setRotation((r) => r + 90)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCw size={12} /> +90°</button>
              <button type="button" onClick={reset} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCcw size={12} /> Reset</button>
            </div></div>
          </div>
        </div>
        {/* Footer - always visible */}
        <div className="relative flex shrink-0 items-center justify-between border-t border-white/5 px-6 py-5">
          <div>{cropError && <p className="text-xs font-medium text-red-400">{cropError}</p>}{!cropError && <p className="text-[10px] text-gray-600">Drag to pan · Scroll to zoom</p>}</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} className="rounded-xl px-5 py-3 text-sm font-medium text-gray-400 ring-1 ring-white/10 hover:bg-white/5 transition">Cancel</button>
            <button type="button" onClick={apply} disabled={applying} className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#22c55e] to-[#16a34a] px-8 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(34,197,94,0.35)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all">
              {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {applying ? "Processing..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageUploader({ value, onChange, label, compact, aspect, cropEnabled = true }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean; aspect?: number; cropEnabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => { if (value) setPreview(value); }, [value]);

  const handleFile = (file: File) => {
    setUploadError(null);
    setStatus(null);
    if (cropEnabled && !compact) {
      const r = new FileReader();
      r.onload = () => setCropSrc(r.result as string);
      r.readAsDataURL(file);
    } else {
      uploadBlob(file);
    }
  };

  const uploadBlob = async (b: File | Blob) => {
    setUploading(true);
    setUploadError(null);
    setStatus("Uploading...");
    const localUrl = URL.createObjectURL(b);
    setPreview(localUrl);
    try {
      const fd = new FormData();
      fd.append("file", new File([b], b instanceof File ? b.name : "cropped.jpg", { type: b.type || "image/jpeg" }));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setPreview(url);
        onChange(url);
        setStatus("Uploaded!");
        setTimeout(() => setStatus(null), 2000);
      } else {
        const txt = await res.text().catch(() => "");
        setUploadError(`Upload failed (${res.status}) ${txt}`);
        onChange(localUrl);
      }
    } catch {
      setUploadError("Network error");
      onChange(localUrl);
    } finally {
      setUploading(false);
    }
  };

  const onCropDone = (blob: Blob) => {
    setCropSrc(null);
    uploadBlob(blob);
  };

  const h = compact ? "h-20" : "h-32";
  return (
    <>
      <div className="space-y-1.5">
        {label && <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</label>}
        <div className={`group relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-linear-to-br from-white/3 to-transparent ${h} transition-all hover:border-[#f59e0b]/40`}>
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" onError={() => setPreview("")} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-500">
              <ImageIcon size={compact ? 18 : 24} />
              <span className="text-[10px]">No image</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => { setMode("upload"); fileRef.current?.click(); }} className="flex items-center gap-1 rounded-lg bg-[#f59e0b] px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg hover:bg-[#e5a32f] transition"><Upload size={12} /> {compact ? "Upload" : "Upload & Crop"}</button>
            {!compact && <button type="button" onClick={() => setMode("url")} className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-white/20 transition"><Globe size={12} /> URL</button>}
          </div>
          {uploading && (<div className="absolute inset-0 grid place-items-center bg-black/70"><Loader2 size={20} className="animate-spin text-[#f59e0b]" /></div>)}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {!compact && mode === "url" && (<div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5"><Globe size={12} className="shrink-0 text-gray-500" /><input className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600" placeholder="Paste image URL..." value={value} onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }} /></div>)}
        {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
        {status && !uploadError && <p className="text-[10px] text-emerald-400">{status}</p>}
        {preview && compact && <button type="button" onClick={() => { onChange(""); setPreview(""); }} className="text-[9px] text-red-400/70 hover:text-red-400">Remove</button>}
      </div>
      {cropSrc && <CropModal src={cropSrc} aspect={aspect} onCrop={onCropDone} onCancel={() => setCropSrc(null)} />}
    </>
  );
}

/* ─── Sections ─── */
type SectionKey = "hero" | "highlights" | "whoWeAre" | "mission" | "features" | "team" | "accreditations" | "impact" | "testimonials" | "cta";

const sectionMeta: Record<SectionKey, { label: string; icon: typeof Rocket; color: string }> = {
  hero: { label: "Hero Section", icon: Rocket, color: "#f59e0b" },
  highlights: { label: "Highlights Bar", icon: Zap, color: "#3b82f6" },
  whoWeAre: { label: "Who We Are", icon: Info, color: "#8b5cf6" },
  mission: { label: "Mission & Technology", icon: Shield, color: "#10b981" },
  features: { label: "Why Choose Us", icon: Star, color: "#ec4899" },
  team: { label: "Team Hierarchy", icon: Users, color: "#f59e0b" },
  accreditations: { label: "Accreditations", icon: Award, color: "#6366f1" },
  impact: { label: "Impact Stats", icon: BarChart3, color: "#0ea5e9" },
  testimonials: { label: "Testimonials", icon: MessageSquare, color: "#f43f5e" },
  cta: { label: "Call to Action", icon: Sparkles, color: "#64748b" },
};

export default function AdminAboutPageEditor() {
  const [config, setConfig] = useState<AboutPageConfig>(defaultAboutPageConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({ hero: true, highlights: false, whoWeAre: false, mission: false, features: false, team: false, accreditations: false, impact: false, testimonials: false, cta: false });
  const initialLoadDone = useRef(false);

  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/admin/content", { cache: "no-store" }); if (res.ok) { const data = (await res.json()) as AdminContent; if (data.aboutPage) setConfig({ ...defaultAboutPageConfig, ...data.aboutPage }); } } catch {} finally { setLoading(false); initialLoadDone.current = true; }
    })();
  }, []);

  const saveConfig = useCallback(async (cfg: AboutPageConfig) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      const cur = res.ok ? (await res.json()) as AdminContent : {} as AdminContent;
      await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cur, aboutPage: cfg }) });
      setSaved(true); setDirty(false); setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setSaving(false); }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    setDirty(true);
    const timer = setTimeout(() => { saveConfig(config); }, 1200);
    return () => clearTimeout(timer);
  }, [config, saveConfig]);

  const save = () => saveConfig(config);

  const toggle = (k: SectionKey) => setExpanded((p) => ({ ...p, [k]: !p[k] }));
  const updateHero = (p: Partial<AboutPageHero>) => setConfig((c) => ({ ...c, hero: { ...c.hero, ...p } }));
  const updateWho = (p: Partial<AboutPageWhoWeAre>) => setConfig((c) => ({ ...c, whoWeAre: { ...c.whoWeAre, ...p } }));
  const updateMission = (p: Partial<AboutPageMission>) => setConfig((c) => ({ ...c, mission: { ...c.mission, ...p } }));
  const updateCta = (p: Partial<AboutPageCta>) => setConfig((c) => ({ ...c, cta: { ...c.cta, ...p } }));

  const setHighlight = (i: number, p: Partial<AboutPageHighlight>) => setConfig((c) => ({ ...c, highlights: c.highlights.map((h, idx) => idx === i ? { ...h, ...p } : h) }));
  const addHighlight = () => setConfig((c) => ({ ...c, highlights: [...c.highlights, { label: "New", value: "0" }] }));
  const removeHighlight = (i: number) => setConfig((c) => ({ ...c, highlights: c.highlights.filter((_, idx) => idx !== i) }));

  const setPillar = (i: number, p: Partial<AboutPagePillar>) => setConfig((c) => ({ ...c, pillars: c.pillars.map((pl, idx) => idx === i ? { ...pl, ...p } : pl) }));

  const setFeature = (i: number, p: Partial<AboutPageFeature>) => setConfig((c) => ({ ...c, features: c.features.map((f, idx) => idx === i ? { ...f, ...p } : f) }));
  const addFeature = () => setConfig((c) => ({ ...c, features: [...c.features, { title: "New", desc: "" }] }));
  const removeFeature = (i: number) => setConfig((c) => ({ ...c, features: c.features.filter((_, idx) => idx !== i) }));

  const setTeamLevel = (i: number, p: Partial<AboutPageTeamLevel>) => setConfig((c) => ({ ...c, teamHierarchy: c.teamHierarchy.map((t, idx) => idx === i ? { ...t, ...p } : t) }));
  const addTeamLevel = () => setConfig((c) => ({ ...c, teamHierarchy: [...c.teamHierarchy, { level: "New Level", members: [{ name: "Name", role: "Role", photo: "" }] }] }));
  const removeTeamLevel = (i: number) => setConfig((c) => ({ ...c, teamHierarchy: c.teamHierarchy.filter((_, idx) => idx !== i) }));
  const setTeamMember = (levelIdx: number, memberIdx: number, p: Partial<AboutPageTeamMember>) =>
    setConfig((c) => ({ ...c, teamHierarchy: c.teamHierarchy.map((t, li) => li === levelIdx ? { ...t, members: t.members.map((m, mi) => mi === memberIdx ? { ...m, ...p } : m) } : t) }));
  const addTeamMember = (levelIdx: number) =>
    setConfig((c) => ({ ...c, teamHierarchy: c.teamHierarchy.map((t, li) => li === levelIdx ? { ...t, members: [...t.members, { name: "", role: "", photo: "" }] } : t) }));
  const removeTeamMember = (levelIdx: number, memberIdx: number) =>
    setConfig((c) => ({ ...c, teamHierarchy: c.teamHierarchy.map((t, li) => li === levelIdx ? { ...t, members: t.members.filter((_, mi) => mi !== memberIdx) } : t) }));

  const setAccred = (i: number, p: Partial<AboutPageAccreditation>) => setConfig((c) => ({ ...c, accreditations: c.accreditations.map((a, idx) => idx === i ? { ...a, ...p } : a) }));
  const addAccred = () => setConfig((c) => ({ ...c, accreditations: [...c.accreditations, { title: "", subtitle: "", desc: "", logo: "" }] }));
  const removeAccred = (i: number) => setConfig((c) => ({ ...c, accreditations: c.accreditations.filter((_, idx) => idx !== i) }));

  const setImpact = (i: number, p: Partial<{ value: string; label: string }>) => setConfig((c) => ({ ...c, impactStats: c.impactStats.map((s, idx) => idx === i ? { ...s, ...p } : s) }));
  const addImpact = () => setConfig((c) => ({ ...c, impactStats: [...c.impactStats, { value: "0", label: "New" }] }));
  const removeImpact = (i: number) => setConfig((c) => ({ ...c, impactStats: c.impactStats.filter((_, idx) => idx !== i) }));

  const setTestimonial = (i: number, v: string) => setConfig((c) => ({ ...c, testimonials: c.testimonials.map((t, idx) => idx === i ? v : t) }));
  const addTestimonial = () => setConfig((c) => ({ ...c, testimonials: [...c.testimonials, ""] }));
  const removeTestimonial = (i: number) => setConfig((c) => ({ ...c, testimonials: c.testimonials.filter((_, idx) => idx !== i) }));

  if (loading) return (<div className="flex items-center justify-center gap-3 py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" /><span className="text-sm text-gray-400">Loading editor...</span></div>);

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60 focus:shadow-[0_0_16px_rgba(245,158,11,0.12)]";
  const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
  const cardCls = "rounded-2xl border border-white/[0.07] bg-linear-to-br from-[#0d1528] via-[#0b1224] to-[#0a0f1e] p-5 shadow-[0_4px_32px_rgba(0,0,0,0.3)]";
  const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3 backdrop-blur-sm transition-all hover:border-white/15";
  const btnAdd = "inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-linear-to-r from-white/[0.02] to-transparent px-4 py-2.5 text-xs text-gray-300 transition hover:border-[#f59e0b]/40 hover:text-[#f59e0b]";
  const btnDanger = "inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300";

  const SectionHeader = ({ sectionKey }: { sectionKey: SectionKey }) => {
    const m = sectionMeta[sectionKey]; const Icon = m.icon; const open = expanded[sectionKey];
    return (<button type="button" onClick={() => toggle(sectionKey)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white/3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}20`, color: m.color }}><Icon size={16} /></div><span className="flex-1 text-sm font-semibold">{m.label}</span><div className={`rounded-md p-1 transition ${open ? "bg-white/10" : "bg-white/5"}`}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div></button>);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-linear-to-r from-[#0d1528] via-[#12182e] to-[#0d1528] p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#8b5cf6]/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#8b5cf6] to-[#6d28d9] shadow-lg shadow-violet-500/20"><BookOpen size={22} className="text-white" /></div>
            <div><h1 className="text-xl font-bold tracking-tight">About Page Editor</h1><p className="text-xs text-gray-400">Manage hero, team, accreditations, mission & all sections for <code className="rounded bg-white/5 px-1 text-[10px] text-[#f59e0b]">/about</code></p></div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/about" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium hover:bg-white/10 transition"><Eye size={13} /> Preview</Link>
            <div className="flex items-center gap-2">
              {saving && <span className="flex items-center gap-1.5 text-[11px] text-amber-300/80"><Loader2 size={12} className="animate-spin" /> Auto-saving...</span>}
              {saved && !saving && <span className="flex items-center gap-1.5 text-[11px] text-emerald-400"><Check size={12} /> Saved</span>}
              {dirty && !saving && !saved && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />}
              <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 transition">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Now"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero ── */}
      <div className={cardCls}><SectionHeader sectionKey="hero" />{expanded.hero && (<div className="mt-4 space-y-3">
        <div><label className={labelCls}>Badge</label><input className={inputCls} value={config.hero.badge} onChange={(e) => updateHero({ badge: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Heading</label><input className={inputCls} value={config.hero.heading} onChange={(e) => updateHero({ heading: e.target.value })} /></div><div><label className={labelCls}>Heading Highlight</label><input className={inputCls} value={config.hero.headingHighlight} onChange={(e) => updateHero({ headingHighlight: e.target.value })} /></div></div>
        <div><label className={labelCls}>Subtitle</label><textarea className={inputCls} rows={3} value={config.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Primary CTA</label><input className={inputCls} value={config.hero.ctaPrimary} onChange={(e) => updateHero({ ctaPrimary: e.target.value })} /></div><div><label className={labelCls}>Secondary CTA</label><input className={inputCls} value={config.hero.ctaSecondary} onChange={(e) => updateHero({ ctaSecondary: e.target.value })} /></div></div>
        <ImageUploader label="Hero Image" value={config.hero.heroImage} onChange={(v) => updateHero({ heroImage: v })} aspect={16 / 9} />
      </div>)}</div>

      {/* ── Highlights ── */}
      <div className={cardCls}><SectionHeader sectionKey="highlights" />{expanded.highlights && (<div className="mt-4 space-y-3">
        {config.highlights.map((h, i) => (<div key={i} className={`flex items-center gap-3 ${itemCls}`}><GripVertical size={14} className="shrink-0 text-gray-600" /><div className="grid flex-1 gap-2 sm:grid-cols-2"><input className={inputCls} value={h.value} onChange={(e) => setHighlight(i, { value: e.target.value })} placeholder="Value" /><input className={inputCls} value={h.label} onChange={(e) => setHighlight(i, { label: e.target.value })} placeholder="Label" /></div><button type="button" onClick={() => removeHighlight(i)} className={btnDanger}><Trash2 size={13} /></button></div>))}
        <button type="button" onClick={addHighlight} className={btnAdd}><Plus size={14} /> Add Highlight</button>
      </div>)}</div>

      {/* ── Who We Are ── */}
      <div className={cardCls}><SectionHeader sectionKey="whoWeAre" />{expanded.whoWeAre && (<div className="mt-4 space-y-3">
        <div><label className={labelCls}>Badge</label><input className={inputCls} value={config.whoWeAre.badge} onChange={(e) => updateWho({ badge: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Heading</label><input className={inputCls} value={config.whoWeAre.heading} onChange={(e) => updateWho({ heading: e.target.value })} /></div><div><label className={labelCls}>Heading Highlight</label><input className={inputCls} value={config.whoWeAre.headingHighlight} onChange={(e) => updateWho({ headingHighlight: e.target.value })} /></div></div>
        <div><label className={labelCls}>Subtitle</label><textarea className={inputCls} rows={3} value={config.whoWeAre.subtitle} onChange={(e) => updateWho({ subtitle: e.target.value })} /></div>
        <div><label className={labelCls}>Bullet Points (one per line)</label><textarea className={inputCls} rows={4} value={config.whoWeAre.bulletPoints.join("\n")} onChange={(e) => updateWho({ bulletPoints: e.target.value.split("\n") })} /></div>
        <ImageUploader label="Background Image" value={config.whoWeAre.backgroundImage} onChange={(v) => updateWho({ backgroundImage: v })} aspect={16 / 9} />
        <p className="text-xs font-semibold text-gray-300 pt-2">Pillar Cards</p>
        {config.pillars.map((p, i) => (<div key={i} className={`grid gap-2 sm:grid-cols-[140px_1fr] ${itemCls}`}><div><label className={labelCls}>Title</label><input className={inputCls} value={p.title} onChange={(e) => setPillar(i, { title: e.target.value })} /></div><div><label className={labelCls}>Description</label><textarea className={inputCls} rows={2} value={p.desc} onChange={(e) => setPillar(i, { desc: e.target.value })} /></div></div>))}
      </div>)}</div>

      {/* ── Mission & Tech ── */}
      <div className={cardCls}><SectionHeader sectionKey="mission" />{expanded.mission && (<div className="mt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-300">Mission Section</p>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Heading Prefix</label><input className={inputCls} value={config.mission.heading} onChange={(e) => updateMission({ heading: e.target.value })} /></div><div><label className={labelCls}>Heading Highlight</label><input className={inputCls} value={config.mission.headingHighlight} onChange={(e) => updateMission({ headingHighlight: e.target.value })} /></div></div>
        <div><label className={labelCls}>Body Paragraph 1</label><textarea className={inputCls} rows={3} value={config.mission.body} onChange={(e) => updateMission({ body: e.target.value })} /></div>
        <div><label className={labelCls}>Body Paragraph 2</label><textarea className={inputCls} rows={2} value={config.mission.body2} onChange={(e) => updateMission({ body2: e.target.value })} /></div>
        <p className="text-xs font-semibold text-gray-300 pt-2">Training Technology Points (one per line)</p>
        <textarea className={inputCls} rows={5} value={config.techPoints.join("\n")} onChange={(e) => setConfig((c) => ({ ...c, techPoints: e.target.value.split("\n") }))} />
      </div>)}</div>

      {/* ── Features ── */}
      <div className={cardCls}><SectionHeader sectionKey="features" />{expanded.features && (<div className="mt-4 space-y-3">
        {config.features.map((f, i) => (<div key={i} className={`flex items-start gap-3 ${itemCls}`}><GripVertical size={14} className="mt-2.5 shrink-0 text-gray-600" /><div className="grid flex-1 gap-2 sm:grid-cols-2"><div><label className={labelCls}>Title</label><input className={inputCls} value={f.title} onChange={(e) => setFeature(i, { title: e.target.value })} /></div><div><label className={labelCls}>Description</label><input className={inputCls} value={f.desc} onChange={(e) => setFeature(i, { desc: e.target.value })} /></div></div><button type="button" onClick={() => removeFeature(i)} className={`${btnDanger} mt-1`}><Trash2 size={13} /></button></div>))}
        <button type="button" onClick={addFeature} className={btnAdd}><Plus size={14} /> Add Feature</button>
      </div>)}</div>

      {/* ── Team ── */}
      <div className={cardCls}><SectionHeader sectionKey="team" />{expanded.team && (<div className="mt-4 space-y-5">
        {config.teamHierarchy.map((tier, i) => (<div key={i} className={`space-y-3 ${itemCls}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f59e0b]/20 text-[10px] font-bold text-[#f59e0b]">{i + 1}</span>
            <input className={`${inputCls} flex-1 font-semibold`} value={tier.level} onChange={(e) => setTeamLevel(i, { level: e.target.value })} placeholder="Level title" />
            <button type="button" onClick={() => removeTeamLevel(i)} className={btnDanger}><Trash2 size={12} /></button>
          </div>
          <div className="space-y-2 pl-8">
            <label className={labelCls}>Members</label>
            {tier.members.map((member, mi) => (
              <div key={mi} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="w-20 shrink-0">
                  <ImageUploader label="Photo" value={member.photo} onChange={(v) => setTeamMember(i, mi, { photo: v })} compact aspect={1} />
                </div>
                <div className="flex-1 space-y-2">
                  <input className={inputCls} value={member.name} onChange={(e) => setTeamMember(i, mi, { name: e.target.value })} placeholder="Full name" />
                  <input className={inputCls} value={member.role} onChange={(e) => setTeamMember(i, mi, { role: e.target.value })} placeholder="Role / designation" />
                </div>
                <button type="button" onClick={() => removeTeamMember(i, mi)} className={btnDanger}><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addTeamMember(i)} className={`${btnAdd} text-[11px]`}><Plus size={12} /> Add Member</button>
          </div>
        </div>))}
        <button type="button" onClick={addTeamLevel} className={btnAdd}><Plus size={14} /> Add Level</button>
      </div>)}</div>

      {/* ── Accreditations ── */}
      <div className={cardCls}><SectionHeader sectionKey="accreditations" />{expanded.accreditations && (<div className="mt-4 space-y-3">
        {config.accreditations.map((a, i) => (<div key={i} className={`grid gap-3 sm:grid-cols-[1fr_1fr_120px] ${itemCls}`}>
          <div className="space-y-2"><div><label className={labelCls}>Title</label><input className={inputCls} value={a.title} onChange={(e) => setAccred(i, { title: e.target.value })} /></div><div><label className={labelCls}>Subtitle</label><input className={inputCls} value={a.subtitle} onChange={(e) => setAccred(i, { subtitle: e.target.value })} /></div></div>
          <div><label className={labelCls}>Description</label><textarea className={inputCls} rows={3} value={a.desc} onChange={(e) => setAccred(i, { desc: e.target.value })} /></div>
          <div className="space-y-1"><ImageUploader label="Logo" value={a.logo} onChange={(v) => setAccred(i, { logo: v })} compact aspect={1} /><button type="button" onClick={() => removeAccred(i)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button></div>
        </div>))}
        <button type="button" onClick={addAccred} className={btnAdd}><Plus size={14} /> Add Accreditation</button>
      </div>)}</div>

      {/* ── Impact ── */}
      <div className={cardCls}><SectionHeader sectionKey="impact" />{expanded.impact && (<div className="mt-4 space-y-3">
        {config.impactStats.map((s, i) => (<div key={i} className={`flex items-center gap-3 ${itemCls}`}><GripVertical size={14} className="shrink-0 text-gray-600" /><div className="grid flex-1 gap-2 sm:grid-cols-2"><input className={inputCls} value={s.value} onChange={(e) => setImpact(i, { value: e.target.value })} placeholder="Value" /><input className={inputCls} value={s.label} onChange={(e) => setImpact(i, { label: e.target.value })} placeholder="Label" /></div><button type="button" onClick={() => removeImpact(i)} className={btnDanger}><Trash2 size={13} /></button></div>))}
        <button type="button" onClick={addImpact} className={btnAdd}><Plus size={14} /> Add Stat</button>
      </div>)}</div>

      {/* ── Testimonials ── */}
      <div className={cardCls}><SectionHeader sectionKey="testimonials" />{expanded.testimonials && (<div className="mt-4 space-y-3">
        {config.testimonials.map((q, i) => (<div key={i} className={`flex items-center gap-2 ${itemCls}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f43f5e]/20 text-[10px] font-bold text-[#fb7185]">{i + 1}</span><input className={`${inputCls} flex-1`} value={q} onChange={(e) => setTestimonial(i, e.target.value)} placeholder="Quote" /><button type="button" onClick={() => removeTestimonial(i)} className={btnDanger}><Trash2 size={12} /></button></div>))}
        <button type="button" onClick={addTestimonial} className={btnAdd}><Plus size={14} /> Add Testimonial</button>
      </div>)}</div>

      {/* ── CTA ── */}
      <div className={cardCls}><SectionHeader sectionKey="cta" />{expanded.cta && (<div className="mt-4 space-y-3">
        <div><label className={labelCls}>Heading</label><input className={inputCls} value={config.cta.heading} onChange={(e) => updateCta({ heading: e.target.value })} /></div>
        <div><label className={labelCls}>Subtitle</label><input className={inputCls} value={config.cta.subtitle} onChange={(e) => updateCta({ subtitle: e.target.value })} /></div>
        <div><label className={labelCls}>Button Text</label><input className={inputCls} value={config.cta.buttonText} onChange={(e) => updateCta({ buttonText: e.target.value })} /></div>
      </div>)}</div>

      {/* ── Sticky Save ── */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3">
        {saving && <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-amber-300 backdrop-blur-md ring-1 ring-amber-500/20"><Loader2 size={12} className="animate-spin" /> Auto-saving...</span>}
        {saved && !saving && <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-emerald-400 backdrop-blur-md ring-1 ring-emerald-500/20"><Check size={12} /> All changes saved</span>}
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-8 py-3 text-sm font-bold text-black shadow-[0_8px_32px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] disabled:opacity-50 transition-all">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Now"}
        </button>
      </div>
    </div>
  );
}
