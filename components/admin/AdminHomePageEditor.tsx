"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crop,
  Eye,
  FlipHorizontal2,
  Globe,
  GripVertical,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Rocket,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
  Sparkles,
  Star,
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
  HomePageConfig,
  HomePageFaq,
  HomePageHero,
  HomePageLearningPath,
  HomePageNewsletter,
  HomePageOrgPlan,
  HomePagePlan,
  HomePageStat,
  HomePageTestimonial,
  HomePageUnlock,
  HomePageWhyFeature,
} from "@/lib/content-schema";
import { defaultHomePageConfig } from "@/lib/content-schema";
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
        canvas.width = bW;
        canvas.height = bH;
        ctx.translate(bW / 2, bH / 2);
        ctx.rotate(rad);
        ctx.scale(flip.h ? -1 : 1, 1);
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

const ASPECT_PRESETS = [
  { label: "Free", value: 0 },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
];

function CropModal({ src, aspect: initialAspect, onCrop, onCancel }: { src: string; aspect?: number; onCrop: (blob: Blob) => void; onCancel: () => void }) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [ar, setAr] = useState(initialAspect ?? 4 / 3);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedArea(pixels), []);
  const [cropError, setCropError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const handleApply = async () => {
    if (!croppedArea) return;
    setCropError(null);
    setApplying(true);
    try { const blob = await getCroppedBlob(src, croppedArea, { h: flipH }, rotation); onCrop(blob); }
    catch (e) { setCropError(e instanceof Error ? e.message : "Crop failed — try again"); setApplying(false); }
  };
  const resetAll = () => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setFlipH(false); };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4" onClick={onCancel}>
      <div className="relative flex w-full max-w-4xl flex-col rounded-3xl border border-white/8 bg-[#070b14] shadow-[0_0_100px_rgba(245,158,11,0.08),0_32px_80px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#f59e0b]/60 to-transparent" />
        {/* Header - fixed */}
        <div className="relative flex shrink-0 items-center justify-between px-6 py-4">
          <div className="absolute inset-0 bg-linear-to-b from-[#f59e0b]/4 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#f59e0b]/25 to-[#f59e0b]/5 ring-1 ring-[#f59e0b]/20"><Crop size={16} className="text-[#f59e0b]" /></div>
            <div><h2 className="text-sm font-bold tracking-tight">Image Studio</h2><p className="text-[10px] text-gray-500">Crop, rotate & transform</p></div>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5">
              {ASPECT_PRESETS.map((p) => (<button key={p.label} type="button" onClick={() => setAr(p.value)} className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${ar === 0 ? p.value === 0 : Math.abs(ar - p.value) < 0.01 ? "bg-[#f59e0b] text-black shadow" : ""} ${!(ar === 0 ? p.value === 0 : Math.abs(ar - p.value) < 0.01) ? "text-gray-400 hover:text-white hover:bg-white/10" : ""}`}>{p.label}</button>))}
            </div>
            <button type="button" onClick={onCancel} className="rounded-xl p-2 text-gray-500 ring-1 ring-white/5 transition hover:bg-white/5 hover:text-white"><X size={16} /></button>
          </div>
        </div>
        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="relative overflow-hidden rounded-2xl bg-black/80 ring-1 ring-white/5" style={{ height: "clamp(200px, 45vh, 500px)" }}>
            <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={ar || undefined} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onCropComplete} showGrid cropShape="rect" objectFit="contain"
              style={{ containerStyle: { borderRadius: "1rem", background: "#05080f" }, mediaStyle: { transform: flipH ? "scaleX(-1)" : undefined }, cropAreaStyle: { border: "2px solid rgba(245, 158, 11, 0.7)", boxShadow: "0 0 30px rgba(245, 158, 11, 0.15)" } }} />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Zoom</span><div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5"><ZoomOut size={12} className="shrink-0 text-gray-500" /><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#f59e0b] h-1 cursor-pointer" /><ZoomIn size={12} className="shrink-0 text-gray-500" /><span className="ml-1 min-w-[3ch] text-right text-[11px] font-mono text-[#f59e0b]">{zoom.toFixed(1)}x</span></div></div>
            <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Rotate</span><div className="flex flex-1 items-center gap-3 rounded-xl bg-white/3 px-3 py-2 ring-1 ring-white/5"><RotateCcw size={12} className="shrink-0 text-gray-500" /><input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1 accent-[#6366f1] h-1 cursor-pointer" /><RotateCw size={12} className="shrink-0 text-gray-500" /><span className="ml-1 min-w-[4ch] text-right text-[11px] font-mono text-[#818cf8]">{rotation}°</span></div></div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 w-14">Tools</span><div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setFlipH(!flipH)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ring-1 transition ${flipH ? "bg-[#f59e0b]/15 text-[#f59e0b] ring-[#f59e0b]/30" : "text-gray-400 ring-white/5 hover:bg-white/5"}`}><FlipHorizontal2 size={12} /> Flip</button>
              <button type="button" onClick={() => setRotation((r) => r - 90)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCcw size={12} /> -90°</button>
              <button type="button" onClick={() => setRotation((r) => r + 90)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCw size={12} /> +90°</button>
              <button type="button" onClick={resetAll} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-400 ring-1 ring-white/5 hover:bg-white/5 transition"><RotateCcw size={12} /> Reset</button>
            </div></div>
          </div>
        </div>
        {/* Footer - always visible */}
        <div className="relative flex shrink-0 items-center justify-between border-t border-white/5 px-6 py-5">
          <div>{cropError && <p className="text-xs font-medium text-red-400">{cropError}</p>}{!cropError && <p className="text-[10px] text-gray-600">Drag to pan · Scroll to zoom</p>}</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} className="rounded-xl px-5 py-3 text-sm font-medium text-gray-400 ring-1 ring-white/10 transition hover:bg-white/5">Cancel</button>
            <button type="button" onClick={handleApply} disabled={applying} className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#22c55e] to-[#16a34a] px-8 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(34,197,94,0.35)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all">
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

  useEffect(() => { if (value) setPreview(value); }, [value]);

  const handleFile = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; if (cropEnabled) setCropSrc(dataUrl); else doUpload(file); };
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

  const onCropDone = (blob: Blob) => { setCropSrc(null); doUpload(blob); };
  const h = compact ? "h-20" : "h-32";

  return (
    <>
      <div className="space-y-1.5">
        {label && <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</label>}
        <div className={`group relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-linear-to-br from-white/3 to-transparent ${h} transition-all hover:border-[#f59e0b]/40`}>
          {preview ? (<img src={preview} alt="Preview" className="h-full w-full object-cover" onError={() => setPreview("")} />) : (<div className="flex h-full flex-col items-center justify-center gap-1 text-gray-500"><ImageIcon size={compact ? 18 : 24} /><span className="text-[10px]">No image</span></div>)}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => { setMode("upload"); fileRef.current?.click(); }} className="flex items-center gap-1 rounded-lg bg-[#f59e0b] px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg transition hover:bg-[#e5a32f]"><Upload size={12} /> {compact ? "Photo" : "Upload & Crop"}</button>
            {!compact && <button type="button" onClick={() => setMode("url")} className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur transition hover:bg-white/20"><Globe size={12} /> URL</button>}
          </div>
          {uploading && (<div className="absolute inset-0 grid place-items-center bg-black/70"><Loader2 size={20} className="animate-spin text-[#f59e0b]" /></div>)}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {!compact && mode === "url" && (<div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5"><Globe size={12} className="shrink-0 text-gray-500" /><input className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600" placeholder="Paste image URL..." value={value} onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }} /></div>)}
        {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
        {preview && compact && <button type="button" onClick={() => { onChange(""); setPreview(""); }} className="text-[9px] text-red-400/70 hover:text-red-400">Remove</button>}
      </div>
      {cropSrc && <CropModal src={cropSrc} aspect={aspect} onCrop={onCropDone} onCancel={() => setCropSrc(null)} />}
    </>
  );
}

/* ─── Section keys ─── */
type SectionKey = "hero" | "stats" | "learningPaths" | "whyFeatures" | "testimonials" | "pricing" | "faqs" | "newsletter" | "unlock" | "media";

const sectionMeta: Record<SectionKey, { label: string; icon: typeof Rocket; color: string }> = {
  hero: { label: "Hero Section", icon: Rocket, color: "#f59e0b" },
  stats: { label: "Statistics Bar", icon: Zap, color: "#3b82f6" },
  learningPaths: { label: "Choose Your Path", icon: BookOpen, color: "#8b5cf6" },
  whyFeatures: { label: "Why Choose Us", icon: Award, color: "#10b981" },
  testimonials: { label: "Testimonials", icon: MessageSquare, color: "#ec4899" },
  pricing: { label: "Pricing Plans", icon: CreditCard, color: "#f59e0b" },
  faqs: { label: "FAQ Section", icon: HelpCircle, color: "#6366f1" },
  newsletter: { label: "Newsletter", icon: Mail, color: "#0ea5e9" },
  unlock: { label: "Unlock Potential / CTA", icon: Sparkles, color: "#f43f5e" },
  media: { label: "Images & Logos", icon: ImageIcon, color: "#64748b" },
};

export default function AdminHomePageEditor() {
  const [config, setConfig] = useState<HomePageConfig>(defaultHomePageConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    hero: true, stats: false, learningPaths: false, whyFeatures: false,
    testimonials: false, pricing: false, faqs: false, newsletter: false,
    unlock: false, media: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as AdminContent;
          if (data.homePage) setConfig({ ...defaultHomePageConfig, ...data.homePage });
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      const current = res.ok ? ((await res.json()) as AdminContent) : ({} as AdminContent);
      await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, homePage: config }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const toggle = (k: SectionKey) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  const updateHero = (patch: Partial<HomePageHero>) => setConfig((p) => ({ ...p, hero: { ...p.hero, ...patch } }));
  const updateNewsletter = (patch: Partial<HomePageNewsletter>) => setConfig((p) => ({ ...p, newsletter: { ...p.newsletter, ...patch } }));
  const updateUnlock = (patch: Partial<HomePageUnlock>) => setConfig((p) => ({ ...p, unlock: { ...p.unlock, ...patch } }));
  const updateOrgPlan = (patch: Partial<HomePageOrgPlan>) => setConfig((p) => ({ ...p, orgPlan: { ...p.orgPlan, ...patch } }));

  const setStat = (i: number, patch: Partial<HomePageStat>) => setConfig((p) => ({ ...p, stats: p.stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const addStat = () => setConfig((p) => ({ ...p, stats: [...p.stats, { value: "0", label: "New Stat" }] }));
  const removeStat = (i: number) => setConfig((p) => ({ ...p, stats: p.stats.filter((_, idx) => idx !== i) }));

  const setPath = (i: number, patch: Partial<HomePageLearningPath>) => setConfig((p) => ({ ...p, learningPaths: p.learningPaths.map((lp, idx) => (idx === i ? { ...lp, ...patch } : lp)) }));

  const setWhyFeature = (i: number, patch: Partial<HomePageWhyFeature>) => setConfig((p) => ({ ...p, whyFeatures: p.whyFeatures.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));
  const addWhyFeature = () => setConfig((p) => ({ ...p, whyFeatures: [...p.whyFeatures, { title: "New Feature", desc: "Description", icon: "Star" }] }));
  const removeWhyFeature = (i: number) => setConfig((p) => ({ ...p, whyFeatures: p.whyFeatures.filter((_, idx) => idx !== i) }));

  const setTestimonial = (i: number, patch: Partial<HomePageTestimonial>) => setConfig((p) => ({ ...p, testimonials: p.testimonials.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  const addTestimonial = () => setConfig((p) => ({ ...p, testimonials: [...p.testimonials, { quote: "", name: "", role: "" }] }));
  const removeTestimonial = (i: number) => setConfig((p) => ({ ...p, testimonials: p.testimonials.filter((_, idx) => idx !== i) }));

  const setIndPlan = (i: number, patch: Partial<HomePagePlan>) => setConfig((p) => ({ ...p, individualPlans: p.individualPlans.map((pl, idx) => (idx === i ? { ...pl, ...patch } : pl)) }));

  const setFaq = (i: number, patch: Partial<HomePageFaq>) => setConfig((p) => ({ ...p, faqs: p.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));
  const addFaq = () => setConfig((p) => ({ ...p, faqs: [...p.faqs, { q: "", a: "" }] }));
  const removeFaq = (i: number) => setConfig((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }));

  const setAccreditLogo = (i: number, v: string) => setConfig((p) => ({ ...p, accreditationLogos: p.accreditationLogos.map((l, idx) => (idx === i ? v : l)) }));
  const addAccreditLogo = () => setConfig((p) => ({ ...p, accreditationLogos: [...p.accreditationLogos, ""] }));
  const removeAccreditLogo = (i: number) => setConfig((p) => ({ ...p, accreditationLogos: p.accreditationLogos.filter((_, idx) => idx !== i) }));

  const setExplorImg = (i: number, v: string) => setConfig((p) => ({ ...p, exploreProgramImages: p.exploreProgramImages.map((img, idx) => (idx === i ? v : img)) }));
  const addExplorImg = () => setConfig((p) => ({ ...p, exploreProgramImages: [...p.exploreProgramImages, ""] }));
  const removeExplorImg = (i: number) => setConfig((p) => ({ ...p, exploreProgramImages: p.exploreProgramImages.filter((_, idx) => idx !== i) }));

  if (loading) return (<div className="flex items-center justify-center gap-3 py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" /><span className="text-sm text-gray-400">Loading editor...</span></div>);

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#f59e0b]/60 focus:shadow-[0_0_16px_rgba(245,158,11,0.12)]";
  const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5";
  const cardCls = "rounded-2xl border border-white/[0.07] bg-linear-to-br from-[#0d1528] via-[#0b1224] to-[#0a0f1e] p-5 shadow-[0_4px_32px_rgba(0,0,0,0.3)]";
  const itemCls = "rounded-xl border border-white/[0.07] bg-black/30 p-3 backdrop-blur-sm transition-all hover:border-white/15";
  const btnAdd = "inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-linear-to-r from-white/[0.02] to-transparent px-4 py-2.5 text-xs text-gray-300 transition hover:border-[#f59e0b]/40 hover:text-[#f59e0b]";
  const btnDanger = "inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300";

  const SectionHeader = ({ sectionKey }: { sectionKey: SectionKey }) => {
    const meta = sectionMeta[sectionKey];
    const Icon = meta.icon;
    const isOpen = expanded[sectionKey];
    return (
      <button type="button" onClick={() => toggle(sectionKey)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white/3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}><Icon size={16} /></div>
        <span className="flex-1 text-sm font-semibold">{meta.label}</span>
        <div className={`rounded-md p-1 transition ${isOpen ? "bg-white/10" : "bg-white/5"}`}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-linear-to-r from-[#0d1528] via-[#12182e] to-[#0d1528] p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#6366f1]/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#f59e0b] to-[#d97706] shadow-lg shadow-amber-500/20"><Home size={22} className="text-black" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Home Page Editor</h1>
              <p className="text-xs text-gray-400">Manage hero, stats, paths, pricing, FAQ and all sections for <code className="rounded bg-white/5 px-1 text-[10px] text-[#f59e0b]">/</code></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium transition hover:bg-white/10"><Eye size={13} /> Preview</Link>
            <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/25 transition hover:shadow-amber-500/40 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Hero ── */}
      <div className={cardCls}><SectionHeader sectionKey="hero" />{expanded.hero && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Heading</label><input className={inputCls} value={config.hero.heading} onChange={(e) => updateHero({ heading: e.target.value })} /></div><div><label className={labelCls}>Heading Highlight</label><input className={inputCls} value={config.hero.headingHighlight} onChange={(e) => updateHero({ headingHighlight: e.target.value })} /></div></div>
          <div><label className={labelCls}>Subtitle</label><textarea className={inputCls} rows={3} value={config.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>Primary CTA</label><input className={inputCls} value={config.hero.ctaPrimary} onChange={(e) => updateHero({ ctaPrimary: e.target.value })} /></div><div><label className={labelCls}>Secondary CTA</label><input className={inputCls} value={config.hero.ctaSecondary} onChange={(e) => updateHero({ ctaSecondary: e.target.value })} /></div></div>
          <div><label className={labelCls}>Hero Video URL</label><input className={inputCls} value={config.hero.videoUrl} onChange={(e) => updateHero({ videoUrl: e.target.value })} placeholder="e.g. /hero-video.mp4" /></div>
        </div>
      )}</div>

      {/* ── Stats ── */}
      <div className={cardCls}><SectionHeader sectionKey="stats" />{expanded.stats && (
        <div className="mt-4 space-y-3">
          {config.stats.map((stat, idx) => (<div key={idx} className={`flex items-center gap-3 ${itemCls}`}>
            <GripVertical size={14} className="shrink-0 text-gray-600 cursor-grab" />
            <div className="grid flex-1 gap-2 sm:grid-cols-2"><input className={inputCls} value={stat.value} onChange={(e) => setStat(idx, { value: e.target.value })} placeholder="Value" /><input className={inputCls} value={stat.label} onChange={(e) => setStat(idx, { label: e.target.value })} placeholder="Label" /></div>
            <button type="button" onClick={() => removeStat(idx)} className={btnDanger}><Trash2 size={13} /></button>
          </div>))}
          <button type="button" onClick={addStat} className={btnAdd}><Plus size={14} /> Add Stat</button>
        </div>
      )}</div>

      {/* ── Learning Paths ── */}
      <div className={cardCls}><SectionHeader sectionKey="learningPaths" />{expanded.learningPaths && (
        <div className="mt-4 space-y-4">
          {config.learningPaths.map((lp, idx) => (<div key={idx} className={`space-y-3 ${itemCls}`}>
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#8b5cf6]/20 text-[10px] font-bold text-[#a5b4fc]">{idx + 1}</span><input className={`${inputCls} flex-1 font-semibold`} value={lp.title} onChange={(e) => setPath(idx, { title: e.target.value })} /></div>
            <textarea className={inputCls} rows={2} value={lp.desc} onChange={(e) => setPath(idx, { desc: e.target.value })} placeholder="Description" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>CTA Text</label><input className={inputCls} value={lp.cta} onChange={(e) => setPath(idx, { cta: e.target.value })} /></div>
              <ImageUploader label="Path Image" value={lp.imageSrc} onChange={(v) => setPath(idx, { imageSrc: v })} compact aspect={16 / 9} />
            </div>
            <div><label className={labelCls}>Key Points (one per line)</label><textarea className={inputCls} rows={4} value={lp.keyPoints.join("\n")} onChange={(e) => setPath(idx, { keyPoints: e.target.value.split("\n") })} /></div>
          </div>))}
        </div>
      )}</div>

      {/* ── Why Features ── */}
      <div className={cardCls}><SectionHeader sectionKey="whyFeatures" />{expanded.whyFeatures && (
        <div className="mt-4 space-y-3">
          {config.whyFeatures.map((f, idx) => (<div key={idx} className={`flex items-start gap-3 ${itemCls}`}>
            <GripVertical size={14} className="mt-2.5 shrink-0 text-gray-600 cursor-grab" />
            <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <div><label className={labelCls}>Title</label><input className={inputCls} value={f.title} onChange={(e) => setWhyFeature(idx, { title: e.target.value })} /></div>
              <div><label className={labelCls}>Description</label><input className={inputCls} value={f.desc} onChange={(e) => setWhyFeature(idx, { desc: e.target.value })} /></div>
              <div><label className={labelCls}>Icon</label><input className={`${inputCls} w-28`} value={f.icon} onChange={(e) => setWhyFeature(idx, { icon: e.target.value })} placeholder="e.g. Users" /></div>
            </div>
            <button type="button" onClick={() => removeWhyFeature(idx)} className={`${btnDanger} mt-1`}><Trash2 size={13} /></button>
          </div>))}
          <button type="button" onClick={addWhyFeature} className={btnAdd}><Plus size={14} /> Add Feature</button>
        </div>
      )}</div>

      {/* ── Testimonials ── */}
      <div className={cardCls}><SectionHeader sectionKey="testimonials" />{expanded.testimonials && (
        <div className="mt-4 space-y-3">
          {config.testimonials.map((t, idx) => (<div key={idx} className={`space-y-2 ${itemCls}`}>
            <textarea className={inputCls} rows={2} value={t.quote} onChange={(e) => setTestimonial(idx, { quote: e.target.value })} placeholder="Quote" />
            <div className="flex items-center gap-2">
              <input className={`${inputCls} flex-1`} value={t.name} onChange={(e) => setTestimonial(idx, { name: e.target.value })} placeholder="Name" />
              <input className={`${inputCls} flex-1`} value={t.role} onChange={(e) => setTestimonial(idx, { role: e.target.value })} placeholder="Role" />
              <button type="button" onClick={() => removeTestimonial(idx)} className={btnDanger}><Trash2 size={13} /></button>
            </div>
          </div>))}
          <button type="button" onClick={addTestimonial} className={btnAdd}><Plus size={14} /> Add Testimonial</button>
        </div>
      )}</div>

      {/* ── Pricing ── */}
      <div className={cardCls}><SectionHeader sectionKey="pricing" />{expanded.pricing && (
        <div className="mt-4 space-y-5">
          <p className="text-xs font-semibold text-gray-300">Individual Plans</p>
          {config.individualPlans.map((plan, idx) => (<div key={idx} className={`space-y-2 ${itemCls}`}>
            <div className="grid gap-2 sm:grid-cols-2"><div><label className={labelCls}>Badge</label><input className={inputCls} value={plan.badge} onChange={(e) => setIndPlan(idx, { badge: e.target.value })} /></div><div><label className={labelCls}>Price</label><input className={inputCls} value={plan.price} onChange={(e) => setIndPlan(idx, { price: e.target.value })} /></div></div>
            <div><label className={labelCls}>Tagline</label><input className={inputCls} value={plan.tagline} onChange={(e) => setIndPlan(idx, { tagline: e.target.value })} /></div>
            <div><label className={labelCls}>Description</label><textarea className={inputCls} rows={2} value={plan.desc} onChange={(e) => setIndPlan(idx, { desc: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2"><div><label className={labelCls}>Note</label><input className={inputCls} value={plan.note} onChange={(e) => setIndPlan(idx, { note: e.target.value })} /></div><div><label className={labelCls}>CTA</label><input className={inputCls} value={plan.cta} onChange={(e) => setIndPlan(idx, { cta: e.target.value })} /></div></div>
            <div><label className={labelCls}>Features (one per line)</label><textarea className={inputCls} rows={3} value={plan.features.join("\n")} onChange={(e) => setIndPlan(idx, { features: e.target.value.split("\n") })} /></div>
          </div>))}

          <p className="text-xs font-semibold text-gray-300 pt-2">Organisation Plan</p>
          <div className={itemCls}>
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2"><div><label className={labelCls}>Title</label><input className={inputCls} value={config.orgPlan.title} onChange={(e) => updateOrgPlan({ title: e.target.value })} /></div><div><label className={labelCls}>Price</label><input className={inputCls} value={config.orgPlan.price} onChange={(e) => updateOrgPlan({ price: e.target.value })} /></div></div>
              <div><label className={labelCls}>Tagline</label><input className={inputCls} value={config.orgPlan.tagline} onChange={(e) => updateOrgPlan({ tagline: e.target.value })} /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls} rows={2} value={config.orgPlan.desc} onChange={(e) => updateOrgPlan({ desc: e.target.value })} /></div>
              <div className="grid gap-2 sm:grid-cols-2"><div><label className={labelCls}>Note</label><input className={inputCls} value={config.orgPlan.note} onChange={(e) => updateOrgPlan({ note: e.target.value })} /></div><div><label className={labelCls}>CTA</label><input className={inputCls} value={config.orgPlan.cta} onChange={(e) => updateOrgPlan({ cta: e.target.value })} /></div></div>
              <div><label className={labelCls}>Features (one per line)</label><textarea className={inputCls} rows={3} value={config.orgPlan.features.join("\n")} onChange={(e) => updateOrgPlan({ features: e.target.value.split("\n") })} /></div>
            </div>
          </div>
        </div>
      )}</div>

      {/* ── FAQs ── */}
      <div className={cardCls}><SectionHeader sectionKey="faqs" />{expanded.faqs && (
        <div className="mt-4 space-y-3">
          {config.faqs.map((faq, idx) => (<div key={idx} className={`space-y-2 ${itemCls}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#6366f1]/20 text-[10px] font-bold text-[#a5b4fc]">{idx + 1}</span>
              <input className={`${inputCls} flex-1`} value={faq.q} onChange={(e) => setFaq(idx, { q: e.target.value })} placeholder="Question" />
              <button type="button" onClick={() => removeFaq(idx)} className={btnDanger}><Trash2 size={12} /></button>
            </div>
            <textarea className={inputCls} rows={2} value={faq.a} onChange={(e) => setFaq(idx, { a: e.target.value })} placeholder="Answer" />
          </div>))}
          <button type="button" onClick={addFaq} className={btnAdd}><Plus size={14} /> Add FAQ</button>
        </div>
      )}</div>

      {/* ── Newsletter ── */}
      <div className={cardCls}><SectionHeader sectionKey="newsletter" />{expanded.newsletter && (
        <div className="mt-4 space-y-3">
          <div><label className={labelCls}>Heading</label><input className={inputCls} value={config.newsletter.heading} onChange={(e) => updateNewsletter({ heading: e.target.value })} /></div>
          <div><label className={labelCls}>Subtitle</label><input className={inputCls} value={config.newsletter.subtitle} onChange={(e) => updateNewsletter({ subtitle: e.target.value })} /></div>
          <div><label className={labelCls}>Button Text</label><input className={inputCls} value={config.newsletter.buttonText} onChange={(e) => updateNewsletter({ buttonText: e.target.value })} /></div>
        </div>
      )}</div>

      {/* ── Unlock / CTA ── */}
      <div className={cardCls}><SectionHeader sectionKey="unlock" />{expanded.unlock && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <div><label className={labelCls}>Heading</label><input className={inputCls} value={config.unlock.heading} onChange={(e) => updateUnlock({ heading: e.target.value })} /></div>
            <div><label className={labelCls}>Subtitle</label><textarea className={inputCls} rows={2} value={config.unlock.subtitle} onChange={(e) => updateUnlock({ subtitle: e.target.value })} /></div>
            <div><label className={labelCls}>CTA Button</label><input className={inputCls} value={config.unlock.cta} onChange={(e) => updateUnlock({ cta: e.target.value })} /></div>
          </div>
          <ImageUploader label="CTA Image" value={config.unlock.image} onChange={(v) => updateUnlock({ image: v })} />
        </div>
      )}</div>

      {/* ── Media / Logos ── */}
      <div className={cardCls}><SectionHeader sectionKey="media" />{expanded.media && (
        <div className="mt-4 space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-gray-300">Accreditation Logos</p><span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">{config.accreditationLogos.length} logos</span></div>
            <div className="grid gap-3 sm:grid-cols-4">
              {config.accreditationLogos.map((logo, idx) => (<div key={idx} className={itemCls}>
                <ImageUploader value={logo} onChange={(v) => setAccreditLogo(idx, v)} compact />
                <button type="button" onClick={() => removeAccreditLogo(idx)} className="mt-1.5 text-[10px] text-red-400 hover:text-red-300">Remove</button>
              </div>))}
            </div>
            <button type="button" onClick={addAccreditLogo} className={`${btnAdd} mt-3`}><Plus size={14} /> Add Logo</button>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-gray-300">Explore Program Images</p><span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">{config.exploreProgramImages.length} images</span></div>
            <div className="grid gap-3 sm:grid-cols-4">
              {config.exploreProgramImages.map((img, idx) => (<div key={idx} className={itemCls}>
                <ImageUploader value={img} onChange={(v) => setExplorImg(idx, v)} compact />
                <button type="button" onClick={() => removeExplorImg(idx)} className="mt-1.5 text-[10px] text-red-400 hover:text-red-300">Remove</button>
              </div>))}
            </div>
            <button type="button" onClick={addExplorImg} className={`${btnAdd} mt-3`}><Plus size={14} /> Add Image</button>
          </div>
        </div>
      )}</div>

      {/* ── Sticky Save ── */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#f59e0b] to-[#d97706] px-8 py-3 text-sm font-bold text-black shadow-[0_8px_32px_rgba(245,158,11,0.35)] transition-all hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : saved ? "All Changes Saved" : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}
