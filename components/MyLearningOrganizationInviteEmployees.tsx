"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Mail, Save, UserPlus, Users } from "lucide-react";
import { CommunityFileUploadZone } from "@/components/CommunityFileUploadZone";
import {
  canInviteMoreEmployees,
  countInvitedEmployees,
  ORG_EMPLOYEE_ROSTER_EVENT,
  readOrgEmployeeRoster,
  rosterDisplayId,
  rosterSeatTotal,
  updateOrgEmployeeRosterEntry,
  type OrgEmployeeRosterEntry,
} from "@/lib/organization-employee-roster";
import {
  getActiveOrgPremiumPlan,
  orgPremiumPlanLearningRule,
  ORG_PREMIUM_PLAN_EVENT,
} from "@/lib/organization-premium-plans";

type Props = {
  companyName?: string | null;
  companySize?: string | null;
  seatsTotal?: number;
};

export function MyLearningOrganizationInviteEmployees({
  companyName,
  companySize,
  seatsTotal: seatsTotalProp,
}: Props) {
  const initialSeats = seatsTotalProp ?? rosterSeatTotal(companySize);
  const [rows, setRows] = useState<OrgEmployeeRosterEntry[]>(() => readOrgEmployeeRoster(initialSeats));
  const [uploadSlot, setUploadSlot] = useState<number | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [savedSlot, setSavedSlot] = useState<number | null>(null);
  const [blockedSlot, setBlockedSlot] = useState<number | null>(null);
  const [activePlan, setActivePlan] = useState(() => getActiveOrgPremiumPlan());

  const refresh = useCallback(() => {
    const total = seatsTotalProp ?? rosterSeatTotal(companySize);
    setActivePlan(getActiveOrgPremiumPlan());
    setRows(readOrgEmployeeRoster(total));
  }, [companySize, seatsTotalProp]);

  useEffect(() => {
    refresh();
    window.addEventListener(ORG_EMPLOYEE_ROSTER_EVENT, refresh);
    window.addEventListener(ORG_PREMIUM_PLAN_EVENT, refresh);
    return () => {
      window.removeEventListener(ORG_EMPLOYEE_ROSTER_EVENT, refresh);
      window.removeEventListener(ORG_PREMIUM_PLAN_EVENT, refresh);
    };
  }, [refresh]);

  const seatTotal = activePlan.seatLimit;
  const invited = countInvitedEmployees(rows);
  const atCapacity = invited >= seatTotal;

  const saveRow = (slot: number, patch: Parameters<typeof updateOrgEmployeeRosterEntry>[2]) => {
    const row = rows.find((r) => r.slot === slot);
    const willInvite = Boolean(
      (patch.name !== undefined ? patch.name.trim() : row?.name) &&
        (patch.email !== undefined ? patch.email.trim() : row?.email),
    );
    if (willInvite && row && !row.invited && !canInviteMoreEmployees(rows, seatTotal, slot)) {
      setBlockedSlot(slot);
      window.setTimeout(() => setBlockedSlot(null), 3000);
      return;
    }
    const next = updateOrgEmployeeRosterEntry(seatTotal, slot, patch);
    setRows(next);
    setSavedSlot(slot);
    window.setTimeout(() => setSavedSlot(null), 2000);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/my-learning?tab=dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to organisation dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Invite Employees</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            <strong className="text-amber-200">{activePlan.name}</strong>
            {companyName ? ` for ${companyName}` : ""} includes{" "}
            <strong className="text-amber-200">{seatTotal} learner seats</strong>.{" "}
            {orgPremiumPlanLearningRule(activePlan)} Add photo, name, email, and position for each
            person below.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Change plan or seat count in{" "}
            <Link href="/my-learning?tab=subscriptions" className="text-amber-200 hover:underline">
              Team Plans
            </Link>
            .
          </p>
        </div>
        <article className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
          <Users className="mx-auto h-5 w-5 text-amber-300" aria-hidden />
          <p className="mt-1 text-2xl font-bold text-white">
            {invited}/{seatTotal}
          </p>
          <p className="text-[10px] text-amber-200/80">Learners invited</p>
        </article>
      </div>

      {atCapacity ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          All {seatTotal} seats on your {activePlan.name} are filled. Upgrade seats in Team Plans to
          invite more employees.
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <article
            key={row.slot}
            className={`rounded-xl border p-4 ${
              row.invited
                ? "border-emerald-500/25 bg-emerald-500/5"
                : "border-white/10 bg-black/30"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex shrink-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-zinc-400 ring-1 ring-white/10">
                  {row.slot}
                </span>
                {row.avatarUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-amber-500/30">
                    <Image src={row.avatarUrl} alt="" fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/40 text-[10px] text-zinc-500">
                    Photo
                  </span>
                )}
                <div>
                  <p className="font-mono text-[10px] text-amber-200/90">{rosterDisplayId(row)}</p>
                  <p className="text-[10px] text-zinc-500">
                    {row.invited ? "Invited" : "Empty seat"}
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Full name</span>
                  <input
                    defaultValue={row.name}
                    key={`name-${row.slot}-${row.name}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== row.name) {
                        saveRow(row.slot, { name: e.target.value });
                      }
                    }}
                    placeholder="e.g. Jane Doe"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="inline-flex items-center gap-1 text-zinc-500">
                    <Mail className="h-3 w-3" aria-hidden />
                    Email
                  </span>
                  <input
                    type="email"
                    defaultValue={row.email}
                    key={`email-${row.slot}-${row.email}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== row.email) {
                        saveRow(row.slot, { email: e.target.value });
                      }
                    }}
                    placeholder="name@company.com"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Position in company</span>
                  <input
                    defaultValue={row.position}
                    key={`pos-${row.slot}-${row.position}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== row.position) {
                        saveRow(row.slot, { position: e.target.value });
                      }
                    }}
                    placeholder="e.g. Quality Manager"
                    className="mt-1 w-full rounded-lg border border-white/40 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>

              <div className="w-full shrink-0 lg:w-48">
                {uploadSlot === row.slot ? (
                  <CommunityFileUploadZone
                    label="Profile photo"
                    fileUrl={uploadUrl}
                    fileName={uploadName}
                    onUploaded={(url) => {
                      saveRow(row.slot, { avatarUrl: url });
                      setUploadSlot(null);
                      setUploadUrl("");
                      setUploadName("");
                    }}
                    onClear={() => {
                      setUploadSlot(null);
                      setUploadUrl("");
                      setUploadName("");
                    }}
                    compact
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setUploadSlot(row.slot)}
                    className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-400/40"
                  >
                    Upload photo
                  </button>
                )}
                {savedSlot === row.slot ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-300">
                    <Save className="h-3 w-3" aria-hidden />
                    Saved
                  </p>
                ) : blockedSlot === row.slot ? (
                  <p className="mt-1 text-[10px] text-rose-300">Seat limit reached on your plan</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-zinc-500">
        <UserPlus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Roster saved on this device until your employee API is connected. Next:{" "}
        <Link href="/my-learning?tab=assign-courses" className="text-amber-200 hover:underline">
          Assign courses
        </Link>
        .
      </p>
    </section>
  );
}
