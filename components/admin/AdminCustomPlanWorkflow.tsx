"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";

export const CUSTOM_PLAN_STAGE_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-amber-500/20 text-amber-200 border-amber-500/30" },
  contacted: { label: "Contacted", className: "bg-blue-500/20 text-blue-200 border-blue-500/30" },
  proposal_sent: { label: "Proposal sent", className: "bg-violet-500/20 text-violet-200 border-violet-500/30" },
  won: { label: "Won · Paid", className: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" },
  lost: { label: "Lost", className: "bg-rose-500/20 text-rose-200 border-rose-500/30" },
};

const STEPS = ["new", "contacted", "proposal_sent", "won"] as const;

type Proposal = {
  orgEmail: string;
  title: string;
  seats: number;
  durationMonths: number;
  amountInr: number;
  message: string;
  sentAt: string;
  expiresAt: string;
  paidAt?: string;
  url: string;
};

type Props = {
  id: string;
  email: string;
  companyName: string;
  employeesLabel: string;
  onChanged: () => void;
};

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/60";
const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400";
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function AdminCustomPlanWorkflow({ id, email, companyName, employeesLabel, onChanged }: Props) {
  const [stage, setStage] = useState("new");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    orgEmail: email,
    title: `Custom Plan — ${companyName || "Organisation"}`,
    seats: String(parseInt(employeesLabel, 10) || ""),
    durationMonths: "12",
    amountInr: "",
    validDays: "14",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/form-submissions/custom-plan?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; stage?: string; proposal?: Proposal | null }) => {
        if (cancelled || !data.ok) return;
        setStage(data.stage ?? "new");
        if (data.proposal) {
          const p = data.proposal;
          setProposal(p);
          setForm((f) => ({
            ...f,
            orgEmail: p.orgEmail,
            title: p.title,
            seats: String(p.seats),
            durationMonths: String(p.durationMonths),
            amountInr: String(p.amountInr),
            message: p.message,
          }));
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/form-submissions/custom-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; url?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed.");
      return data;
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Update failed." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const changeStage = async (next: string) => {
    if (next === stage) return;
    if (await post({ action: "stage", stage: next })) {
      setStage(next);
      onChanged();
    }
  };

  const sendProposal = async () => {
    const data = await post({
      action: "proposal",
      orgEmail: form.orgEmail,
      title: form.title,
      seats: Number(form.seats),
      durationMonths: Number(form.durationMonths),
      amountInr: Number(form.amountInr),
      validDays: Number(form.validDays),
      message: form.message,
    });
    if (!data?.url) return;
    const now = new Date();
    setStage("proposal_sent");
    setProposal({
      orgEmail: form.orgEmail.trim().toLowerCase(),
      title: form.title,
      seats: Number(form.seats),
      durationMonths: Number(form.durationMonths),
      amountInr: Number(form.amountInr),
      message: form.message,
      sentAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + Number(form.validDays || 14) * 86_400_000).toISOString(),
      url: data.url,
    });
    setNotice({ ok: true, text: `Proposal emailed to ${form.orgEmail}.` });
    onChanged();
  };

  const copyLink = async () => {
    if (!proposal?.url) return;
    await navigator.clipboard.writeText(proposal.url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading workflow…
      </div>
    );
  }

  const paid = Boolean(proposal?.paidAt);
  const stepIdx = STEPS.indexOf(stage as (typeof STEPS)[number]);

  return (
    <div className="mt-5 max-w-3xl rounded-xl border border-amber-500/25 bg-[#0d1528] p-4">
      <p className="text-[11px] font-bold text-amber-200">Custom Plan workflow</p>

      <ol className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
        {STEPS.map((s, i) => {
          const done = stage !== "lost" && stepIdx >= i;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                  done ? CUSTOM_PLAN_STAGE_META[s].className : "border-white/10 text-gray-500"
                }`}
              >
                {done ? <Check size={10} /> : <span className="w-2.5 text-center">{i + 1}</span>}
                {CUSTOM_PLAN_STAGE_META[s].label}
              </span>
              {i < STEPS.length - 1 ? <span className="text-gray-600">→</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-gray-400">Stage:</span>
        <select
          value={stage}
          disabled={busy || paid}
          onChange={(e) => void changeStage(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
        >
          {Object.entries(CUSTOM_PLAN_STAGE_META).map(([k, v]) => (
            <option key={k} value={k} disabled={k === "won" && !paid}>
              {v.label}
            </option>
          ))}
        </select>
        {stage === "new" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void changeStage("contacted")}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200"
          >
            Mark as contacted
          </button>
        ) : null}
        <span className="text-[10px] text-gray-500">&quot;Won&quot; is set automatically when the organisation pays.</span>
      </div>

      {proposal ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-gray-300">
          <p>
            <strong className="text-white">{proposal.title}</strong> · {proposal.seats} employees ·{" "}
            {proposal.durationMonths} months · <strong className="text-amber-200">{inr(proposal.amountInr)}</strong>
          </p>
          <p className="mt-1 text-gray-400">
            Sent {fmt(proposal.sentAt)} to {proposal.orgEmail} · valid till {fmt(proposal.expiresAt)}
            {paid ? <span className="ml-1 font-semibold text-emerald-300">· Paid {fmt(proposal.paidAt)}</span> : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={proposal.url} className={`${inputCls} max-w-md font-mono text-[10px]`} />
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-gray-200 hover:bg-white/10"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy payment link"}
            </button>
          </div>
        </div>
      ) : null}

      {!paid ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-gray-200">
            {proposal ? "Update & re-send proposal" : "Prepare proposal"}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Plan title</label>
              <input className={inputCls} value={form.title} onChange={set("title")} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Organisation login email (who pays &amp; gets the seats)</label>
              <input className={inputCls} value={form.orgEmail} onChange={set("orgEmail")} />
            </div>
            <div>
              <label className={labelCls}>Employees (seats)</label>
              <input type="number" min={1} className={inputCls} value={form.seats} onChange={set("seats")} />
            </div>
            <div>
              <label className={labelCls}>Duration (months)</label>
              <input type="number" min={1} max={60} className={inputCls} value={form.durationMonths} onChange={set("durationMonths")} />
            </div>
            <div>
              <label className={labelCls}>Total amount (₹)</label>
              <input type="number" min={1} className={inputCls} value={form.amountInr} onChange={set("amountInr")} placeholder="e.g. 750000" />
            </div>
            <div>
              <label className={labelCls}>Link valid for (days)</label>
              <input type="number" min={1} max={90} className={inputCls} value={form.validDays} onChange={set("validDays")} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Message to the organisation (optional)</label>
              <textarea
                rows={3}
                className={inputCls}
                value={form.message}
                onChange={set("message")}
                placeholder="What's included, onsite sessions, special terms…"
              />
            </div>
          </div>
          {Number(form.seats) > 0 && Number(form.amountInr) > 0 ? (
            <p className="mt-2 text-[11px] text-gray-400">
              ≈ {inr(Number(form.amountInr) / Number(form.seats))} per employee
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendProposal()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#f5b942] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {proposal ? "Re-send proposal email" : "Send proposal & payment link"}
          </button>
        </div>
      ) : null}

      {notice ? (
        <p className={`mt-3 text-xs ${notice.ok ? "text-emerald-300" : "text-rose-300"}`}>{notice.text}</p>
      ) : null}
    </div>
  );
}
