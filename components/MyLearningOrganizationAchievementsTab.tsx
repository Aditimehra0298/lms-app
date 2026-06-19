"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Award,
  Building2,
  Crown,
  FileText,
  Flame,
  Medal,
  ShieldCheck,
  Star,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { CommunityFileUploadZone } from "@/components/CommunityFileUploadZone";
import type { ManagedCourse } from "@/lib/content-schema";
import { defaultOrgEmployeeProgress, formatOrgEmployeeUserId } from "@/lib/organization-dashboard";
import {
  addOrgCompanyBadge,
  addOrgEmployeeCredential,
  isOrgCredentialPdf,
  ORG_BRANDING_EVENT,
  organizationBrandingSamples,
  readOrgCompanyBranding,
  readOrgEmployeeCredentials,
  saveOrgCompanyLogo,
  type OrgCompanyBadge,
  type OrgEmployeeCredential,
} from "@/lib/organization-achievements-branding";
import type { TutorLedExploreCard, TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import {
  buildOrganizationTeamCertificates,
  buildOrganizationTeamProgress,
  buildOrganizationTeamTutorProgress,
  mergeOrganizationTeamCertificates,
  summarizeTeamProgress,
  type OrgTeamCertificateRow,
} from "@/lib/organization-team-progress";

type Props = {
  companyName?: string | null;
  courses: ManagedCourse[];
  tutorEnrollments: TutorLedLiveHubRow[];
  tutorExplore: TutorLedExploreCard[];
  companySize?: string | null;
  globalBadgeImage?: string;
};

function FamePill({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "emerald" | "violet" | "sky" | "rose";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
      : tone === "violet"
        ? "bg-violet-500/20 text-violet-200 ring-violet-400/30"
        : tone === "sky"
          ? "bg-sky-500/20 text-sky-200 ring-sky-400/30"
          : tone === "rose"
            ? "bg-rose-500/20 text-rose-200 ring-rose-400/30"
            : "bg-[#FFC107]/15 text-[#FFC107] ring-[#FFC107]/35";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function FameFrame({
  label,
  labels,
  labelTone,
  title,
  subtitle,
  meta,
  frameTone = "gold",
  children,
}: {
  label?: string;
  labels?: Array<{ text: string; tone?: "gold" | "emerald" | "violet" | "sky" | "rose" }>;
  labelTone?: "gold" | "emerald" | "violet" | "sky" | "rose";
  title: string;
  subtitle?: string;
  meta?: string;
  frameTone?: "gold" | "violet" | "emerald" | "rose";
  children: ReactNode;
}) {
  const border =
    frameTone === "violet"
      ? "border-violet-400/45 from-violet-500/15"
      : frameTone === "emerald"
        ? "border-emerald-400/40 from-emerald-500/12"
        : frameTone === "rose"
          ? "border-rose-400/40 from-rose-500/12"
          : "border-[#FFC107]/50 from-[#FFC107]/12";

  return (
    <article className="w-[172px] shrink-0 snap-start">
      <div
        className={`rounded-xl border-2 bg-gradient-to-b to-black/80 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${border}`}
      >
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50 ring-1 ring-white/5">
          {children}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(labels ?? (label ? [{ text: label, tone: labelTone }] : [])).map((pill) => (
          <FamePill key={pill.text} tone={pill.tone ?? labelTone}>
            {pill.text}
          </FamePill>
        ))}
      </div>
      <p className="mt-1.5 truncate text-xs font-bold text-white">{title}</p>
      {subtitle ? (
        <p className="truncate text-[10px] leading-snug text-zinc-400">{subtitle}</p>
      ) : null}
      {meta ? <p className="mt-0.5 font-mono text-[10px] text-[#FFC107]">{meta}</p> : null}
    </article>
  );
}

function MediaThumb({
  src,
  alt,
  contain = false,
}: {
  src?: string;
  alt: string;
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const display = src?.trim();

  if (!display || failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-amber-500/10 to-violet-500/10 text-amber-300/70">
        <Award className="h-9 w-9" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      <Image
        src={display}
        alt={alt}
        fill
        unoptimized
        className={contain ? "object-contain p-2" : "object-cover"}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function MyLearningOrganizationAchievementsTab({
  companyName,
  courses,
  tutorEnrollments,
  tutorExplore,
  companySize,
  globalBadgeImage,
}: Props) {
  const [branding, setBranding] = useState(readOrgCompanyBranding);
  const [employeeCreds, setEmployeeCreds] = useState<OrgEmployeeCredential[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoName, setLogoName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState("");
  const [badgeName, setBadgeName] = useState("");
  const [empCredUrl, setEmpCredUrl] = useState("");
  const [empCredName, setEmpCredName] = useState("");
  const [empCredStory, setEmpCredStory] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("1");

  const employees = useMemo(() => defaultOrgEmployeeProgress(), []);
  const displayCompany = companyName?.trim() || "Your organisation";

  const refresh = useCallback(() => {
    setBranding(readOrgCompanyBranding());
    setEmployeeCreds(readOrgEmployeeCredentials());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ORG_BRANDING_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ORG_BRANDING_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const teamCerts = useMemo(() => {
    const selfPaced = buildOrganizationTeamProgress(courses, companySize);
    const tutorLed = buildOrganizationTeamTutorProgress(tutorEnrollments, tutorExplore, companySize);
    return mergeOrganizationTeamCertificates(
      buildOrganizationTeamCertificates(selfPaced, tutorLed),
      true,
    ).filter((c) => c.status === "ready");
  }, [courses, tutorEnrollments, tutorExplore, companySize]);

  const progressSummary = useMemo(
    () => summarizeTeamProgress(buildOrganizationTeamProgress(courses, companySize)),
    [courses, companySize],
  );

  const companyBadges: OrgCompanyBadge[] =
    branding.badges.length > 0 ? branding.badges : organizationBrandingSamples();

  const usingSampleBadges = branding.badges.length === 0;

  const overallPercent = Math.min(
    100,
    Math.round(
      (progressSummary.completedEnrollments /
        Math.max(1, progressSummary.completedEnrollments + progressSummary.inProgressEnrollments)) *
        100,
    ) || 0,
  );

  const hasWall =
    Boolean(branding.logoUrl) ||
    companyBadges.length > 0 ||
    teamCerts.length > 0 ||
    employeeCreds.length > 0;

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? employees[0];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.35)] md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFC107]/80">
            Team success
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Team Wall of Fame
            <span className="text-zinc-400"> — {displayCompany}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Same design as individual achievements — plus premium organisation branding: your company
            logo, custom badges, and employee credentials showing how they earned certificates for your
            company.
          </p>
        </div>
        <Link
          href="/my-learning?tab=certificates"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFC107]/35 bg-[#FFC107]/10 px-3 py-2 text-xs font-semibold text-[#FFC107] hover:bg-[#FFC107]/20"
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          Team certificates
        </Link>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
        <Crown className="h-3.5 w-3.5" aria-hidden />
        Premium — organisation logo & custom badges
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {[
          { icon: Users, label: "Assigned", value: progressSummary.employeesAssigned },
          { icon: Flame, label: "In progress", value: progressSummary.inProgressEnrollments },
          { icon: Trophy, label: "Completed", value: progressSummary.completedEnrollments },
          { icon: Medal, label: "Certificates", value: teamCerts.length },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2"
          >
            <Icon className="h-4 w-4 text-[#FFC107]" aria-hidden />
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-[10px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {!hasWall ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">
          Upload your company logo or a team certificate to start your organisation wall of fame.
        </p>
      ) : (
        <div className="-mx-1 mt-5 snap-x snap-mandatory overflow-x-auto px-1 pb-2">
          <div className="flex min-w-min gap-3">
            {branding.logoUrl ? (
              <FameFrame
                frameTone="rose"
                labels={[
                  { text: "Company logo", tone: "rose" },
                  { text: "Premium", tone: "gold" },
                ]}
                title={displayCompany}
                subtitle={branding.logoName ?? "Organisation logo"}
              >
                <MediaThumb src={branding.logoUrl} alt={displayCompany} contain />
              </FameFrame>
            ) : null}

            {companyBadges.map((badge) => (
              <FameFrame
                key={badge.id}
                frameTone="violet"
                label={usingSampleBadges ? "Sample badge" : "Company badge"}
                labelTone="violet"
                title={badge.name}
                subtitle={displayCompany}
              >
                <MediaThumb src={badge.url} alt={badge.name} contain />
              </FameFrame>
            ))}

            {teamCerts.map((cert) => (
              <CertFameFrame key={cert.id} cert={cert} globalBadgeImage={globalBadgeImage} />
            ))}

            {employeeCreds.map((item) => {
              const isPdf = isOrgCredentialPdf(item.name, item.url);
              return (
                <FameFrame
                  key={item.id}
                  frameTone="sky"
                  labels={[
                    { text: "Employee upload", tone: "sky" },
                    { text: item.employeeUserId, tone: "gold" },
                  ]}
                  title={item.employeeName}
                  subtitle={item.story ?? item.name.replace(/\.[^.]+$/, "")}
                  meta={new Date(item.uploadedAt).toLocaleDateString()}
                >
                  {isPdf ? (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-sky-500/10 px-2">
                      <FileText className="h-10 w-10 text-sky-300/80" aria-hidden />
                      <span className="text-center text-[9px] font-semibold uppercase text-sky-200/90">
                        PDF
                      </span>
                    </div>
                  ) : (
                    <MediaThumb src={item.url} alt={item.name} contain />
                  )}
                </FameFrame>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-amber-500/25 bg-black/25 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <Building2 size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white">Company logo & badges</h3>
              <p className="mt-1 text-xs text-gray-400">
                Upload your organisation logo and custom badges — shown on the team wall and employee
                certificate frames (premium branding).
              </p>
              <div className="mt-3 space-y-3">
                <CommunityFileUploadZone
                  label="Company logo (PNG/JPG)"
                  fileUrl={logoUrl}
                  fileName={logoName}
                  onUploaded={(url, name) => {
                    saveOrgCompanyLogo(url, name);
                    setLogoUrl("");
                    setLogoName("");
                    refresh();
                  }}
                  onClear={() => {
                    setLogoUrl("");
                    setLogoName("");
                  }}
                  compact
                />
                <CommunityFileUploadZone
                  label="Custom company badge"
                  fileUrl={badgeUrl}
                  fileName={badgeName}
                  onUploaded={(url, name) => {
                    addOrgCompanyBadge(url, name);
                    setBadgeUrl("");
                    setBadgeName("");
                    refresh();
                  }}
                  onClear={() => {
                    setBadgeUrl("");
                    setBadgeName("");
                  }}
                  compact
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sky-300">
              <Upload size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white">Employee credential story</h3>
              <p className="mt-1 text-xs text-gray-400">
                Upload how an employee earned their certificate and the value for your company (PNG,
                JPG, or PDF).
              </p>
              <div className="mt-3 space-y-2">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} · {formatOrgEmployeeUserId(emp.id)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={empCredStory}
                  onChange={(e) => setEmpCredStory(e.target.value)}
                  placeholder="How they earned it / impact for the company (optional)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
                <CommunityFileUploadZone
                  label="Upload credential"
                  fileUrl={empCredUrl}
                  fileName={empCredName}
                  onUploaded={(url, name) => {
                    if (!selectedEmployee) return;
                    addOrgEmployeeCredential({
                      employeeId: selectedEmployee.id,
                      employeeName: selectedEmployee.name,
                      employeeUserId: formatOrgEmployeeUserId(selectedEmployee.id),
                      url,
                      name,
                      story: empCredStory,
                    });
                    setEmpCredUrl("");
                    setEmpCredName("");
                    setEmpCredStory("");
                    refresh();
                  }}
                  onClear={() => {
                    setEmpCredUrl("");
                    setEmpCredName("");
                  }}
                  compact
                />
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            Team learning progress
          </span>
          <span className="font-semibold text-white">{overallPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFC107] to-amber-400"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">
          {teamCerts.length} team certificate{teamCerts.length === 1 ? "" : "s"} on the wall
          {branding.logoUrl ? " · Company logo active" : ""}
          {branding.badges.length > 0
            ? ` · ${branding.badges.length} custom badge${branding.badges.length === 1 ? "" : "s"}`
            : usingSampleBadges
              ? " · Sample badges shown until you upload"
              : ""}
          {employeeCreds.length > 0
            ? ` · ${employeeCreds.length} employee upload${employeeCreds.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
    </section>
  );
}

function CertFameFrame({
  cert,
  globalBadgeImage,
}: {
  cert: OrgTeamCertificateRow;
  globalBadgeImage?: string;
}) {
  const badge = globalBadgeImage?.trim();
  return (
    <FameFrame
      frameTone="gold"
      labels={[
        { text: "Team certificate", tone: "gold" },
        ...(badge ? [{ text: "Badge", tone: "violet" as const }] : []),
      ]}
      title={cert.employeeName}
      subtitle={cert.courseTitle}
      meta={cert.scorePercent != null ? `${cert.scorePercent}% · ${cert.employeeUserId}` : cert.employeeUserId}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-zinc-100">
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-500/15 to-violet-500/10 px-2">
          <div className="text-center">
            <Award className="mx-auto h-8 w-8 text-amber-400/80" aria-hidden />
            <p className="mt-1 line-clamp-2 text-[9px] font-semibold text-zinc-700">{cert.courseTitle}</p>
          </div>
        </div>
        {badge ? (
          <div className="absolute bottom-1.5 right-1.5 h-10 w-10 overflow-hidden rounded-full border-2 border-[#FFC107]/70 bg-black/85 p-0.5">
            <MediaThumb src={badge} alt="Badge" contain />
          </div>
        ) : null}
      </div>
    </FameFrame>
  );
}
