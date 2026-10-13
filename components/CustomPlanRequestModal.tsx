"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, X } from "lucide-react";

const FORMATS = ["Self-paced eLearning", "Live tutor-led (online)", "Onsite classroom", "Custom content", "Workshops"];
const COMPANY_SIZES = ["1–50", "51–200", "201–500", "501–1,000", "1,000+"];
const DURATIONS = ["3 months", "6 months", "12 months", "2+ years", "Not sure yet"];
const TIMELINES = ["Immediately", "Within 1 month", "1–3 months", "3+ months"];
const BUDGETS = ["Under ₹5 lakh", "₹5–10 lakh", "₹10–25 lakh", "₹25 lakh+", "Prefer not to say"];

type Props = { open: boolean; onClose: () => void };

const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-amber-400/70";
const labelCls = "mb-1 block text-xs font-semibold text-gray-300";

const EMPTY = {
  fullName: "",
  email: "",
  mobile: "",
  companyName: "",
  designation: "",
  industry: "",
  companySize: "",
  employeesToTrain: "",
  topics: "",
  duration: "",
  startTimeline: "",
  budget: "",
  requirements: "",
  website: "",
};

export function CustomPlanRequestModal({ open, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [formats, setFormats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleFormat = (f: string) =>
    setFormats((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/organization/custom-plan-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, trainingFormats: formats }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message || "Could not submit. Please try again.");
      setDone(data.message || "Thank you! Our team will contact you shortly.");
      setForm(EMPTY);
      setFormats([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setDone("");
    setError("");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-plan-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-5 shadow-[0_0_40px_rgba(249,177,77,0.25)] sm:p-7">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        {done ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h2 className="mt-4 text-xl font-bold text-white">Request received</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-300">{done}</p>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-black hover:brightness-110"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="custom-plan-title" className="text-xl font-bold text-white">
              Request a Custom Plan
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Tell us about your organisation and training needs. Our team will prepare a tailored proposal and contact
              you within 24 hours.
            </p>

            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-300">Your details</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full name *</label>
                <input className={inputCls} value={form.fullName} onChange={set("fullName")} autoComplete="name" required />
              </div>
              <div>
                <label className={labelCls}>Work email *</label>
                <input type="email" className={inputCls} value={form.email} onChange={set("email")} autoComplete="email" required />
              </div>
              <div>
                <label className={labelCls}>Mobile number *</label>
                <input type="tel" className={inputCls} value={form.mobile} onChange={set("mobile")} autoComplete="tel" required />
              </div>
              <div>
                <label className={labelCls}>Designation</label>
                <input className={inputCls} value={form.designation} onChange={set("designation")} placeholder="e.g. HR Manager, L&D Head" />
              </div>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-300">Organisation</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Company name *</label>
                <input className={inputCls} value={form.companyName} onChange={set("companyName")} autoComplete="organization" required />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <input className={inputCls} value={form.industry} onChange={set("industry")} placeholder="e.g. Manufacturing, IT, Energy" />
              </div>
              <div>
                <label className={labelCls}>Total company size</label>
                <select className={inputCls} value={form.companySize} onChange={set("companySize")}>
                  <option value="">Select</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Employees to train *</label>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className={inputCls}
                  value={form.employeesToTrain}
                  onChange={set("employeesToTrain")}
                  placeholder="e.g. 350"
                  required
                />
              </div>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-300">Training requirements</p>
            <div className="mt-2">
              <label className={labelCls}>Preferred training formats</label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => {
                  const on = formats.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleFormat(f)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        on
                          ? "border-amber-400 bg-amber-500/20 text-amber-100"
                          : "border-white/15 bg-black/30 text-gray-300 hover:border-amber-400/50"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Courses or topics of interest</label>
              <input
                className={inputCls}
                value={form.topics}
                onChange={set("topics")}
                placeholder="e.g. ESG reporting, carbon accounting, sustainability leadership"
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Plan duration</label>
                <select className={inputCls} value={form.duration} onChange={set("duration")}>
                  <option value="">Select</option>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>When to start</label>
                <select className={inputCls} value={form.startTimeline} onChange={set("startTimeline")}>
                  <option value="">Select</option>
                  {TIMELINES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Approx. budget</label>
                <select className={inputCls} value={form.budget} onChange={set("budget")}>
                  <option value="">Select</option>
                  {BUDGETS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Describe your requirements in detail *</label>
              <textarea
                className={inputCls}
                rows={5}
                value={form.requirements}
                onChange={set("requirements")}
                placeholder="Goals of the training, job roles / departments, locations, certification needs, reporting, branding, any other expectations…"
                required
              />
            </div>

            <input
              type="text"
              name="website"
              value={form.website}
              onChange={set("website")}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-2500 h-0 w-0 opacity-0"
            />

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={close} className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-gray-200 hover:bg-white/10">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Sending…" : "Send Requirements"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
