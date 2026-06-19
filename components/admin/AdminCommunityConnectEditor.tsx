"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageCircle, Plus, Save, Trash2 } from "lucide-react";
import type { AdminContent } from "@/lib/content-schema";
import {
  COMMUNITY_CONNECT,
  type CommunityConnectCard,
  type CommunityConnectIcon,
  type CommunityConnectTone,
} from "@/lib/my-learning-community-defaults";

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs text-white placeholder:text-gray-500";

const ICONS: CommunityConnectIcon[] = ["whatsapp", "facebook", "linkedin", "instagram", "email"];
const TONES: CommunityConnectTone[] = ["emerald", "blue", "sky", "violet", "pink"];

function newCard(): CommunityConnectCard {
  return {
    id: `connect-${Date.now()}`,
    icon: "whatsapp",
    title: "",
    description: "",
    cta: "Open",
    href: "",
    tone: "emerald",
    published: true,
  };
}

export function AdminCommunityConnectEditor() {
  const [cards, setCards] = useState<CommunityConnectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as AdminContent;
      const stored = data.dashboard?.communityConnect ?? [];
      setCards(stored.length > 0 ? stored : COMMUNITY_CONNECT.map((c) => ({ ...c })));
      setStatus(null);
    } catch {
      setStatus("Could not load community connect cards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (index: number, patchRow: Partial<CommunityConnectCard>) => {
    setCards((rows) => rows.map((r, i) => (i === index ? { ...r, ...patchRow } : r)));
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const current = (await res.json()) as AdminContent;
      const cleaned = cards
        .filter((c) => c.title.trim() && c.href.trim())
        .map((c) => ({
          ...c,
          id: c.id?.trim() || `connect-${c.icon}`,
          title: c.title.trim(),
          description: c.description?.trim() || "",
          cta: c.cta?.trim() || "Open",
          href: c.href.trim(),
          published: c.published !== false,
        }));
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          dashboard: {
            ...current.dashboard,
            communityConnect: cleaned,
          },
        }),
      });
      if (!put.ok) throw new Error("save failed");
      setCards(cleaned);
      setStatus("Saved — learners see these on My Learning → Community.");
    } catch {
      setStatus("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setCards(COMMUNITY_CONNECT.map((c) => ({ ...c })));
    setStatus("Loaded defaults — click Save to apply.");
  };

  return (
    <article className="mt-4 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 to-[#0d1528] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/35 bg-violet-500/15">
            <MessageCircle className="h-5 w-5 text-violet-300" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Community — Connect With Us</h3>
            <p className="mt-0.5 max-w-xl text-[11px] text-gray-400">
              WhatsApp, social links, and email shown on{" "}
              <span className="font-mono text-gray-300">/my-learning?tab=community</span>. Leave empty
              fields unpublished or use Reset defaults.
            </p>
          </div>
        </div>
        <Link
          href="/my-learning?tab=community"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/20"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Preview community
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-gray-500">Loading connect cards…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {cards.map((row, index) => (
            <div
              key={row.id || index}
              className="grid gap-3 rounded-lg border border-white/10 bg-[#0a1120] p-3 md:grid-cols-2 xl:grid-cols-4"
            >
              <label className="block">
                <span className="text-[10px] text-gray-500">Platform</span>
                <select
                  value={row.icon}
                  onChange={(e) => patch(index, { icon: e.target.value as CommunityConnectIcon })}
                  className={fieldClass}
                >
                  {ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] text-gray-500">Card title</span>
                <input
                  value={row.title}
                  onChange={(e) => patch(index, { title: e.target.value })}
                  placeholder="WhatsApp Group"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-gray-500">Button label</span>
                <input
                  value={row.cta}
                  onChange={(e) => patch(index, { cta: e.target.value })}
                  placeholder="Join Group"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-gray-500">Accent color</span>
                <select
                  value={row.tone}
                  onChange={(e) => patch(index, { tone: e.target.value as CommunityConnectTone })}
                  className={fieldClass}
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-[10px] text-gray-500">Link URL</span>
                <input
                  value={row.href}
                  onChange={(e) => patch(index, { href: e.target.value })}
                  placeholder="https://… or mailto:…"
                  className={fieldClass}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[10px] text-gray-500">Short description</span>
                <input
                  value={row.description}
                  onChange={(e) => patch(index, { description: e.target.value })}
                  placeholder="Shown under the card title"
                  className={fieldClass}
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
                <label className="flex items-center gap-2 text-[10px] text-gray-400">
                  <input
                    type="checkbox"
                    checked={row.published !== false}
                    onChange={(e) => patch(index, { published: e.target.checked })}
                    className="rounded"
                  />
                  Live on community tab
                </label>
                <button
                  type="button"
                  onClick={() => setCards((rows) => rows.filter((_, i) => i !== index))}
                  className="ml-auto rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
                  aria-label="Remove card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCards((rows) => [...rows, newCard()])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs font-semibold text-white hover:border-violet-400/40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add card
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              className="rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs font-semibold text-gray-300 hover:border-white/20"
            >
              Reset defaults
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFC107] px-4 py-2 text-xs font-bold text-black hover:bg-[#FFD54F] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saving ? "Saving…" : "Save connect links"}
            </button>
            {status ? <span className="text-[11px] text-gray-400">{status}</span> : null}
          </div>
        </div>
      )}
    </article>
  );
}
