"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Database,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getLearnerEmail, clearLearnerProfileStorage } from "@/lib/learner-session-client";
import { AdminCyberHero } from "@/components/admin/AdminCyberHero";
import { PASSWORD_POLICY_RULES, checkPasswordPolicy } from "@/lib/password-policy";

type Overview = {
  security: {
    score: number;
    checks: { id: string; label: string; ok: boolean; detail: string }[];
    mainAdminMasked: string | null;
    paymentsReady: boolean;
    paymentMode: string;
  };
  totals: {
    users: number;
    admins: number;
    organisations: number;
    enrollments: number;
  };
};

type PanelSettings = {
  requirePanelPassword: boolean;
  requireGoogleVerification: boolean;
  requireEmailVerificationForSensitive: boolean;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  hasCustomPanelPassword: boolean;
  updatedAt: string | null;
};

type DatabaseStatus = {
  engine: string;
  urlConfigured: boolean;
  connected: boolean;
  hostHint: string | null;
  phpMyAdminRequired: boolean;
  phpMyAdminPurpose?: string;
  summary: string;
  talkingPoints: string[];
  docsPath: string;
};

type Props = {
  onNavigate?: (menu: string) => void;
};

export default function AdminSettingsWorkspace({ onNavigate }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [database, setDatabase] = useState<DatabaseStatus | null>(null);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [mainAdminMasked, setMainAdminMasked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [platformBusy, setPlatformBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);

  const [requirePanelPassword, setRequirePanelPassword] = useState(true);
  const [requireGoogleVerification, setRequireGoogleVerification] = useState(true);
  const [requireEmailVerificationForSensitive, setRequireEmailVerificationForSensitive] =
    useState(true);
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = adminHeaders();
      const [overviewRes, settingsRes] = await Promise.all([
        fetch("/api/admin/overview", { cache: "no-store", headers }),
        fetch("/api/admin/settings", { cache: "no-store", headers }),
      ]);
      const overview = (await overviewRes.json()) as Overview & { ok?: boolean; message?: string };
      const panel = (await settingsRes.json()) as {
        ok?: boolean;
        message?: string;
        settings?: PanelSettings;
        passwordConfigured?: boolean;
        googleConfigured?: boolean;
        mainAdminMasked?: string | null;
        database?: DatabaseStatus;
      };
      if (!overviewRes.ok || !overview.ok) throw new Error(overview.message ?? "Could not load settings");
      if (!settingsRes.ok || !panel.ok || !panel.settings) {
        throw new Error(panel.message ?? "Could not load admin settings");
      }
      setData(overview);
      setSettings(panel.settings);
      setDatabase(panel.database ?? null);
      setPasswordConfigured(Boolean(panel.passwordConfigured));
      setGoogleConfigured(Boolean(panel.googleConfigured));
      setMainAdminMasked(panel.mainAdminMasked ?? null);
      setRequirePanelPassword(panel.settings.requirePanelPassword);
      setRequireGoogleVerification(panel.settings.requireGoogleVerification);
      setRequireEmailVerificationForSensitive(panel.settings.requireEmailVerificationForSensitive);
      setPlatformName(panel.settings.platformName);
      setSupportEmail(panel.settings.supportEmail);
      setSupportPhone(panel.settings.supportPhone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendCode = async () => {
    setOtpBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "send-verification" }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Could not send code");
      setNotice(json.message ?? "Verification code sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setOtpBusy(false);
    }
  };

  const changePassword = async () => {
    setPasswordBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
          confirmPassword,
          verificationCode: verificationCode.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        needsVerification?: boolean;
      };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Could not update password");
      setNotice(json.message ?? "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setPasswordBusy(false);
    }
  };

  const saveSecurity = async () => {
    setSecurityBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: "update-security",
          requirePanelPassword,
          requireGoogleVerification,
          requireEmailVerificationForSensitive,
          verificationCode: verificationCode.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        settings?: PanelSettings;
      };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Could not save security settings");
      setNotice(json.message ?? "Security settings saved.");
      if (json.settings) setSettings(json.settings);
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save security settings");
    } finally {
      setSecurityBusy(false);
    }
  };

  const savePlatform = async () => {
    setPlatformBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: "update-platform",
          platformName,
          supportEmail,
          supportPhone,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; settings?: PanelSettings };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Could not save platform details");
      setNotice(json.message ?? "Platform details saved.");
      if (json.settings) setSettings(json.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save platform details");
    } finally {
      setPlatformBusy(false);
    }
  };

  const logout = () => {
    void fetch("/api/auth/admin-logout", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      try {
        clearLearnerProfileStorage();
        sessionStorage.removeItem("sft_admin_access_email");
        localStorage.removeItem("sft_user_role");
      } catch {
        /* ignore */
      }
      window.location.href = "/";
    });
  };

  const score = data?.security.score ?? 0;
  const scoreTone =
    score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-rose-300";
  const policy = checkPasswordPolicy(newPassword);
  // Password + security changes always require email OTP (POC-D-13).
  const needsOtp = true;

  return (
    <div className="space-y-5">
      <AdminCyberHero
        eyebrow="Control centre · Other"
        title="Admin panel settings"
        description="Change the admin password, verification rules, and platform details — the same core controls every LMS admin panel needs."
        accent="cyan"
        chips={["Password", "Verification", "Platform", "Security health"]}
      >
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </AdminCyberHero>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </p>
      ) : null}

      {data ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-cyan-400/20 bg-[#0d1528] p-4">
            <p className="text-[11px] text-gray-400">Security score</p>
            <p className={`mt-1 text-3xl font-bold ${scoreTone}`}>{score}</p>
            <p className="text-[11px] text-gray-500">Live posture checks</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
            <p className="text-[11px] text-gray-400">Main administrator</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">
              {mainAdminMasked ?? data.security.mainAdminMasked ?? "Not set"}
            </p>
            <p className="text-[11px] text-gray-500">Locked account for this panel</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
            <p className="text-[11px] text-gray-400">Panel password</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {passwordConfigured ? (settings?.hasCustomPanelPassword ? "Custom" : "Configured") : "Not set"}
            </p>
            <p className="text-[11px] text-gray-500">
              {googleConfigured ? "Google verification available" : "Google not connected"}
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
            <p className="text-[11px] text-gray-400">Protected accounts</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {data.totals.admins} admin · {data.totals.users} users
            </p>
            <p className="text-[11px] text-gray-500">{data.totals.organisations} organisations</p>
          </article>
        </section>
      ) : null}

      {/* Password */}
      <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] via-[#0d1528] to-[#0a1120] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-white">Change admin panel password</h2>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          This password is required on the admin sign-in screen (when password protection is on). It is stored as a
          secure hash — never shown in plain text.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs text-gray-400">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
            />
          </label>
          <label className="block text-xs text-gray-400">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={
                passwordBusy ||
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmPassword ||
                !PASSWORD_POLICY_RULES.every((r) => policy[r.key])
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
            >
              {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update password
            </button>
          </div>
        </div>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {PASSWORD_POLICY_RULES.map((rule) => (
            <li
              key={rule.key}
              className={`text-[11px] ${policy[rule.key] ? "text-emerald-300" : "text-gray-500"}`}
            >
              {policy[rule.key] ? "✓" : "○"} {rule.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Verification for sensitive changes */}
      {needsOtp ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white">Email verification</h2>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            Changing the admin password or security toggles always requires a verification code
            sent to your admin email.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-xs text-gray-400">
              6-digit code
              <input
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm tracking-[0.3em] text-white outline-none focus:border-amber-400/40"
              />
            </label>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={otpBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50"
            >
              {otpBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send code
            </button>
          </div>
        </section>
      ) : null}

      {/* Security toggles */}
      <section className="rounded-2xl border border-white/10 bg-[#0d1528] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white">Sign-in & verification rules</h2>
        </div>
        <div className="space-y-3">
          {[
            {
              id: "pwd",
              checked: requirePanelPassword,
              set: setRequirePanelPassword,
              title: "Require admin password",
              desc: "Ask for the panel password before opening admin.",
            },
            {
              id: "google",
              checked: requireGoogleVerification,
              set: setRequireGoogleVerification,
              title: "Require Google verification",
              desc: googleConfigured
                ? "After password, confirm with Google using the configured main admin account."
                : "Google is not connected yet — turn this on after Google is set up.",
            },
            {
              id: "otp",
              checked: requireEmailVerificationForSensitive,
              set: setRequireEmailVerificationForSensitive,
              title: "Email code for sensitive changes",
              desc: "Ask for an email code before changing password or security rules.",
            },
          ].map((row) => (
            <label
              key={row.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3"
            >
              <input
                type="checkbox"
                checked={row.checked}
                onChange={(e) => row.set(e.target.checked)}
                className="mt-1 rounded border-white/20"
              />
              <span>
                <span className="block text-sm font-medium text-white">{row.title}</span>
                <span className="mt-0.5 block text-xs text-gray-400">{row.desc}</span>
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void saveSecurity()}
          disabled={securityBusy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {securityBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save security rules
        </button>
      </section>

      {/* Database — boss / auditor talking points */}
      {database ? (
        <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] via-[#0d1528] to-[#0a1120] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-semibold text-white">Database (for management questions)</h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                database.connected
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-amber-500/20 text-amber-100"
              }`}
            >
              {database.connected ? "MySQL connected" : "MySQL not connected"}
            </span>
          </div>
          <p className="text-xs text-gray-300">{database.summary}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Engine</p>
              <p className="mt-0.5 text-sm font-medium text-white">{database.engine}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">phpMyAdmin</p>
              <p className="mt-0.5 text-sm font-medium text-white">Optional · safety only</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Location</p>
              <p className="mt-0.5 truncate text-sm font-medium text-white">
                {database.hostHint ?? (database.urlConfigured ? "Configured" : "Not set yet")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            If your boss asks — you can say
          </p>
          <ul className="mt-2 space-y-1.5">
            {database.talkingPoints.map((point) => (
              <li
                key={point}
                className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-gray-300"
              >
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-gray-500">
            Full write-up for the future: <span className="text-cyan-200/90">{database.docsPath}</span>
          </p>
        </section>
      ) : null}

      {/* Platform */}
      <section className="rounded-2xl border border-white/10 bg-[#0d1528] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-300" />
          <h2 className="text-sm font-semibold text-white">Platform details</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-xs text-gray-400">
            Platform name
            <input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Support email
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@company.com"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Support phone
            <input
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+91 …"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void savePlatform()}
          disabled={platformBusy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
        >
          {platformBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save platform details
        </button>
      </section>

      {data ? (
        <section className="rounded-2xl border border-white/10 bg-[#0d1528] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Security checklist</h2>
          </div>
          <ul className="space-y-3">
            {data.security.checks.map((check) => (
              <li
                key={check.id}
                className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3"
              >
                <div
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${
                    check.ok
                      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                      : "bg-amber-500/15 text-amber-300 ring-amber-400/30"
                  }`}
                >
                  {check.ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{check.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Users & access",
            desc: "Roles, certificates, organisations",
            menu: "Roles & Permissions",
            icon: Users,
          },
          {
            title: "Orders & payments",
            desc: "Refunds, free access, waiting checkouts",
            menu: "Payments",
            icon: CreditCard,
          },
          {
            title: "Sign out securely",
            desc: "Clear this admin session on this device",
            menu: "",
            icon: Lock,
            action: logout,
          },
        ].map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => {
              if (card.action) card.action();
              else if (card.menu) onNavigate?.(card.menu);
            }}
            className="rounded-xl border border-white/10 bg-[#0b1224] p-4 text-left transition hover:border-cyan-400/30 hover:bg-[#0f1830]"
          >
            <card.icon className="mb-2 h-4 w-4 text-cyan-300" />
            <p className="text-sm font-semibold text-white">{card.title}</p>
            <p className="mt-1 text-[11px] text-gray-500">{card.desc}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
