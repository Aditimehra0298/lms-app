"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CalendarClock, CheckCircle2, Loader2, Users } from "lucide-react";
import { organisationLoginHref, startCustomPlanCheckout } from "@/lib/org-plan-checkout-client";

type Proposal = {
  companyName: string;
  contactName: string;
  orgEmail: string;
  title: string;
  seats: number;
  durationMonths: number;
  amountInr: number;
  message: string;
  expiresAt: string;
  status: "open" | "paid" | "expired";
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function CustomPlanProposalView({ id }: { id: string }) {
  const router = useRouter();
  const token = useSearchParams().get("t") ?? "";
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organization/custom-plan?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; proposal?: Proposal; message?: string }) => {
        if (cancelled) return;
        if (data.ok && data.proposal) setProposal(data.proposal);
        else setLoadError(data.message ?? "This proposal link is invalid.");
      })
      .catch(() => !cancelled && setLoadError("Could not load the proposal. Please refresh."));
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const pay = async () => {
    setBusy(true);
    setMessage("");
    const result = await startCustomPlanCheckout(id, token);
    setBusy(false);
    if (result.status === "login") {
      router.push(organisationLoginHref(`/custom-plan/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`));
    } else if (result.status === "not-organisation") {
      setMessage(`Please sign in with the organisation account ${proposal?.orgEmail ?? ""} to pay.`);
    } else if (result.status === "paid") {
      setPaid(true);
    } else if (result.status === "error") {
      setMessage(result.message);
    }
  };

  const validTill = proposal?.expiresAt
    ? new Date(proposal.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const isPaid = paid || proposal?.status === "paid";

  return (
    <main className="min-h-screen bg-[#0a0808] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        {loadError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
            <p className="text-lg font-semibold">{loadError}</p>
            <p className="mt-2 text-sm text-gray-300">Please use the link from your email, or contact our team.</p>
            <Link href="/contact" className="mt-5 inline-block rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black">
              Contact us
            </Link>
          </div>
        ) : !proposal ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <article className="rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_30px_rgba(249,177,77,0.2)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Custom Plan proposal</p>
            <h1 className="mt-1 text-2xl font-bold">{proposal.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
              <Building2 className="h-4 w-4 text-amber-300" /> {proposal.companyName || proposal.orgEmail}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <Users className="h-4 w-4 text-amber-300" />
                <p className="mt-2 text-2xl font-bold">{proposal.seats}</p>
                <p className="text-xs text-gray-400">Employees (seats)</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <CalendarClock className="h-4 w-4 text-amber-300" />
                <p className="mt-2 text-2xl font-bold">{proposal.durationMonths}</p>
                <p className="text-xs text-gray-400">Months of access</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs text-amber-100">Total</p>
                <p className="mt-1 text-2xl font-extrabold">{inr(proposal.amountInr)}</p>
                <p className="text-xs text-gray-400">One-time payment</p>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-gray-200">
              <li>• Access to all self-paced eLearning courses for {proposal.seats} employees</li>
              <li>• Add employees and assign courses from your organisation dashboard</li>
              <li>• Track employee progress and course completion</li>
            </ul>

            {proposal.message ? (
              <div className="mt-6 whitespace-pre-line rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
                {proposal.message}
              </div>
            ) : null}

            <div className="mt-8">
              {isPaid ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                  <p className="mt-2 font-semibold">Payment received — your plan is active.</p>
                  <Link
                    href="/my-learning?tab=dashboard"
                    className="mt-4 inline-block rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black"
                  >
                    Open organisation dashboard
                  </Link>
                </div>
              ) : proposal.status === "expired" ? (
                <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                  This proposal expired on {validTill}. Please ask our team to send an updated proposal.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void pay()}
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy ? "Opening payment…" : `Accept & Pay ${inr(proposal.amountInr)}`}
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-400">
                    Sign in with your organisation account <strong className="text-gray-200">{proposal.orgEmail}</strong>{" "}
                    to pay. Valid till {validTill}.
                  </p>
                </>
              )}
              {message ? (
                <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{message}</p>
              ) : null}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
