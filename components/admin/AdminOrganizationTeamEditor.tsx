"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, Save, Trash2, Users, Cpu } from "lucide-react";
import { type AdminContent } from "@/lib/content-schema";
import { getLearnerEmail } from "@/lib/learner-session-client";
import {
  mergeOrganizationTeamAdminConfig,
  ORG_PREMIUM_PLAN_IDS,
  type OrganizationPremiumPlanConfig,
  type OrganizationTeamAdminConfig,
  type OrganizationTeamRecord,
  type OrgPremiumPlanId,
} from "@/lib/organization-team-config";

const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-[#0a1120] px-3 py-2 text-xs text-white placeholder:text-gray-500 outline-none focus:border-sky-400/40";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-500";

type OrgListRow = { workEmail: string; companyName: string; identificationNumber: number };

export function AdminOrganizationTeamEditor() {
  const [planConfig, setPlanConfig] = useState<OrganizationTeamAdminConfig>(
    mergeOrganizationTeamAdminConfig(),
  );
  const [orgs, setOrgs] = useState<OrgListRow[]>([]);
  const [teams, setTeams] = useState<OrganizationTeamRecord[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [teamDraft, setTeamDraft] = useState<OrganizationTeamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlans, setSavingPlans] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState({
    companyName: "",
    workEmail: "",
    industryType: "",
    companySize: "",
    planId: "monthly-premium" as OrgPremiumPlanId,
  });

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
      ...(email ? { "x-admin-email": email } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const adminEmail = getLearnerEmail();
      const teamUrl = adminEmail
        ? `/api/admin/organization-teams?email=${encodeURIComponent(adminEmail)}`
        : "/api/admin/organization-teams";
      const [contentRes, orgsRes, teamsRes] = await Promise.all([
        fetch("/api/admin/content", { cache: "no-store" }),
        fetch("/api/admin/organizations", { cache: "no-store", headers: adminHeaders() }),
        fetch(teamUrl, { cache: "no-store", headers: adminHeaders() }),
      ]);
      if (contentRes.ok) {
        const content = (await contentRes.json()) as AdminContent;
        setPlanConfig(mergeOrganizationTeamAdminConfig(content.organizationTeam));
      }
      if (orgsRes.ok) {
        const data = (await orgsRes.json()) as {
          organizations?: Array<{
            workEmail: string;
            companyName: string;
            identificationNumber: number;
          }>;
        };
        setOrgs(
          (data.organizations ?? []).map((o) => ({
            workEmail: o.workEmail,
            companyName: o.companyName,
            identificationNumber: o.identificationNumber,
          })),
        );
      }
      if (teamsRes.ok) {
        const data = (await teamsRes.json()) as { teams?: OrganizationTeamRecord[] };
        setTeams(data.teams ?? []);
      }
      setStatus(null);
    } catch {
      setStatus("Could not load organisation settings.");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchPlan = (id: OrgPremiumPlanId, patch: Partial<OrganizationPremiumPlanConfig>) => {
    setPlanConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const savePlanConfig = async () => {
    setSavingPlans(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const current = (await res.json()) as AdminContent;
      const cleaned = mergeOrganizationTeamAdminConfig(planConfig);
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          organizationTeam: cleaned,
        }),
      });
      if (!put.ok) throw new Error("save");
      setPlanConfig(cleaned);
      setStatus("Plan tiers saved.");
    } catch {
      setStatus("Failed to save plan configuration.");
    } finally {
      setSavingPlans(false);
    }
  };

  const createOrganisation = async () => {
    setCreatingOrg(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          companyName: newOrg.companyName.trim(),
          workEmail: newOrg.workEmail.trim(),
          industryType: newOrg.industryType.trim() || undefined,
          companySize: newOrg.companySize.trim() || undefined,
          planId: newOrg.planId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        organization?: OrgListRow;
        team?: OrganizationTeamRecord;
      };
      if (!res.ok || !data.ok || !data.organization) {
        throw new Error(data.message ?? "Could not create organisation");
      }
      setOrgs((rows) => {
        const next = rows.filter((r) => r.workEmail !== data.organization!.workEmail);
        return [...next, data.organization!].sort((a, b) =>
          a.companyName.localeCompare(b.companyName),
        );
      });
      if (data.team) {
        setTeams((rows) => {
          const next = rows.filter((r) => r.workEmail !== data.team!.workEmail);
          return [...next, data.team!];
        });
        setTeamDraft(data.team);
        setSelectedOrg(data.organization.workEmail);
      }
      setNewOrg({
        companyName: "",
        workEmail: "",
        industryType: "",
        companySize: "",
        planId: planConfig.defaultPlanId,
      });
      setStatus(`Organisation “${data.organization.companyName}” is ready.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not create organisation.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const loadOrgTeam = async (workEmail: string) => {
    setSelectedOrg(workEmail);
    if (!workEmail) {
      setTeamDraft(null);
      return;
    }
    const adminEmail = getLearnerEmail();
    const res = await fetch(
      `/api/admin/organization-teams?workEmail=${encodeURIComponent(workEmail)}${
        adminEmail ? `&email=${encodeURIComponent(adminEmail)}` : ""
      }`,
      { cache: "no-store", headers: adminHeaders() },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { team?: OrganizationTeamRecord };
    if (data.team) setTeamDraft(data.team);
  };

  const saveOrgTeam = async () => {
    if (!teamDraft) return;
    setSavingTeam(true);
    setStatus(null);
    try {
      const put = await fetch("/api/admin/organization-teams", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify(teamDraft),
      });
      if (!put.ok) throw new Error("save");
      const data = (await put.json()) as { team?: OrganizationTeamRecord };
      if (data.team) {
        setTeamDraft(data.team);
        setTeams((rows) => {
          const next = rows.filter((r) => r.workEmail !== data.team!.workEmail);
          return [...next, data.team!];
        });
      }
      setStatus(`Saved team settings for ${teamDraft.companyName ?? teamDraft.workEmail}.`);
    } catch {
      setStatus("Failed to save organisation team.");
    } finally {
      setSavingTeam(false);
    }
  };

  const patchRosterRow = (
    slot: number,
    patch: Partial<OrganizationTeamRecord["roster"][number]>,
  ) => {
    if (!teamDraft) return;
    setTeamDraft({
      ...teamDraft,
      roster: teamDraft.roster.map((r) =>
        r.slot === slot
          ? {
              ...r,
              ...patch,
              invited: Boolean(
                (patch.name !== undefined ? patch.name.trim() : r.name) &&
                  (patch.email !== undefined ? patch.email.trim() : r.email),
              ),
            }
          : r,
      ),
    });
  };

  if (loading) {
    return <p className="mt-4 text-sm text-gray-400">Loading organisation control…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-[#0a1628] via-[#0c1428] to-[#070b14]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.55) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:px-6">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/35 shadow-[0_0_28px_rgba(56,189,248,0.22)]">
              <Building2 className="h-6 w-6 text-sky-200" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">
                Users &amp; access
              </p>
              <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Organisation control</h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                Add companies from the admin panel, set seat plans, and manage who sits on each organisation team.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            {["Add from web", "Seat plans", "Team roster", `${orgs.length} organisations`].map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-sky-100"
              >
                <Cpu className="h-3 w-3" aria-hidden />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {status ? (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs text-sky-100">
          {status}
        </p>
      ) : null}

      <article className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] via-[#0d1528] to-[#0a1120] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white">Add organisation</h2>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Create a company account here — no website registration needed. Then set seats and roster below.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-xs text-gray-400">
            Company name
            <input
              className={inputCls}
              value={newOrg.companyName}
              onChange={(e) => setNewOrg((o) => ({ ...o, companyName: e.target.value }))}
              placeholder="Acme Learning Pvt Ltd"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Work email
            <input
              type="email"
              className={inputCls}
              value={newOrg.workEmail}
              onChange={(e) => setNewOrg((o) => ({ ...o, workEmail: e.target.value }))}
              placeholder="learning@company.com"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Plan
            <select
              className={inputCls}
              value={newOrg.planId}
              onChange={(e) =>
                setNewOrg((o) => ({ ...o, planId: e.target.value as OrgPremiumPlanId }))
              }
            >
              {ORG_PREMIUM_PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {planConfig.plans.find((p) => p.id === id)?.name ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-400">
            Industry (optional)
            <input
              className={inputCls}
              value={newOrg.industryType}
              onChange={(e) => setNewOrg((o) => ({ ...o, industryType: e.target.value }))}
              placeholder="Technology / Healthcare…"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Company size (optional)
            <input
              className={inputCls}
              value={newOrg.companySize}
              onChange={(e) => setNewOrg((o) => ({ ...o, companySize: e.target.value }))}
              placeholder="50–200"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void createOrganisation()}
              disabled={creatingOrg || !newOrg.companyName.trim() || !newOrg.workEmail.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_rgba(16,185,129,0.25)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creatingOrg ? "Saving…" : "Create organisation"}
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-[#FFC107]/25 bg-gradient-to-br from-[#FFC107]/5 to-[#0d1528] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/15">
              <Users className="h-5 w-5 text-[#FFC107]" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Premium plan tiers</h3>
              <p className="mt-0.5 max-w-2xl text-[11px] text-gray-400">
                Controls Monthly Premium (20), Early Program (50+), and Premium Package (124) seat
                limits, copy, and features for organisation invite / assign / subscriptions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void savePlanConfig()}
            disabled={savingPlans}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {savingPlans ? "Saving…" : "Save plan tiers"}
          </button>
        </div>

        <div className="mt-2">
          <label className={labelCls}>Default plan for new organisations</label>
          <select
            className={inputCls}
            value={planConfig.defaultPlanId}
            onChange={(e) =>
              setPlanConfig((p) => ({ ...p, defaultPlanId: e.target.value as OrgPremiumPlanId }))
            }
          >
            {ORG_PREMIUM_PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {planConfig.plans.find((p) => p.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label className={labelCls}>Learning rule template</label>
          <input
            className={inputCls}
            value={planConfig.learningRuleTemplate}
            onChange={(e) => setPlanConfig((p) => ({ ...p, learningRuleTemplate: e.target.value }))}
            placeholder="{seats} employees can learn any course…"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {planConfig.plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-200">{plan.name}</p>
              <div>
                <label className={labelCls}>Display name</label>
                <input
                  className={inputCls}
                  value={plan.name}
                  onChange={(e) => patchPlan(plan.id, { name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input
                  className={inputCls}
                  value={plan.tagline}
                  onChange={(e) => patchPlan(plan.id, { tagline: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Default seats</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.defaultSeatLimit}
                    onChange={(e) =>
                      patchPlan(plan.id, { defaultSeatLimit: Number(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Min</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.minSeatLimit}
                    onChange={(e) =>
                      patchPlan(plan.id, { minSeatLimit: Number(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Max</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.maxSeatLimit}
                    onChange={(e) =>
                      patchPlan(plan.id, { maxSeatLimit: Number(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Features (one per line)</label>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={plan.features.join("\n")}
                  onChange={(e) =>
                    patchPlan(plan.id, {
                      features: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-gray-400">
                <input
                  type="checkbox"
                  checked={plan.highlighted === true}
                  onChange={(e) => patchPlan(plan.id, { highlighted: e.target.checked })}
                />
                Highlight on subscriptions page
              </label>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/35 bg-sky-500/15">
              <Building2 className="h-5 w-5 text-sky-300" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Organisation team & seats</h3>
              <p className="mt-0.5 max-w-2xl text-[11px] text-gray-400">
                Pick a company to edit plan, seat limit, and employee roster. Changes show on their My Learning
                dashboard.
              </p>
            </div>
          </div>
          {teamDraft ? (
            <button
              type="button"
              onClick={() => void saveOrgTeam()}
              disabled={savingTeam}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {savingTeam ? "Saving…" : "Save organisation team"}
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Select organisation</label>
            <select
              className={inputCls}
              value={selectedOrg}
              onChange={(e) => void loadOrgTeam(e.target.value)}
            >
              <option value="">— Choose organisation —</option>
              {orgs.map((o) => (
                <option key={o.workEmail} value={o.workEmail}>
                  {o.companyName} ({o.workEmail})
                </option>
              ))}
              {teams
                .filter((t) => !orgs.some((o) => o.workEmail === t.workEmail))
                .map((t) => (
                  <option key={t.workEmail} value={t.workEmail}>
                    {t.companyName ?? t.workEmail}
                  </option>
                ))}
            </select>
          </div>
          {teamDraft ? (
            <>
              <div>
                <label className={labelCls}>Active plan</label>
                <select
                  className={inputCls}
                  value={teamDraft.planId}
                  onChange={(e) =>
                    setTeamDraft({ ...teamDraft, planId: e.target.value as OrgPremiumPlanId })
                  }
                >
                  {ORG_PREMIUM_PLAN_IDS.map((id) => (
                    <option key={id} value={id}>
                      {planConfig.plans.find((p) => p.id === id)?.name ?? id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Seat limit override</label>
                <input
                  type="number"
                  className={inputCls}
                  value={teamDraft.seatLimit ?? ""}
                  onChange={(e) =>
                    setTeamDraft({
                      ...teamDraft,
                      seatLimit: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </>
          ) : null}
        </div>

        {teamDraft ? (
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
            <p className="text-[11px] text-gray-500">
              {teamDraft.roster.filter((r) => r.invited).length} invited · {teamDraft.roster.length}{" "}
              slots
            </p>
            {teamDraft.roster.map((row) => (
              <div
                key={row.slot}
                className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
              >
                <span className="self-center text-[10px] font-bold text-zinc-500">#{row.slot}</span>
                <input
                  className={inputCls}
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => patchRosterRow(row.slot, { name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Email"
                  value={row.email}
                  onChange={(e) => patchRosterRow(row.slot, { email: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Position"
                  value={row.position}
                  onChange={(e) => patchRosterRow(row.slot, { position: e.target.value })}
                />
                <button
                  type="button"
                  title="Clear seat"
                  onClick={() =>
                    patchRosterRow(row.slot, {
                      name: "",
                      email: "",
                      position: "",
                      invited: false,
                    })
                  }
                  className="self-center rounded border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            Select an organisation to edit invited employees, plan, and seats.{" "}
            {teams.length > 0 ? `${teams.length} team record(s) on file.` : "No team records yet."}
          </p>
        )}
      </article>

      <p className="text-[10px] text-gray-600">
        Tip: Organisation learners sync from{" "}
        <code className="text-gray-400">/api/organization/team</code> on My Learning load. Plan
        definitions sync from admin content on every page load.
      </p>
    </div>
  );
}
