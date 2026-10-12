import { prisma } from "@/lib/prisma";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { validateLearnerPassword } from "@/lib/password-policy";
import { registrationPeriodFromDate } from "@/lib/registration-ids";
import { emailAppName, emailAppUrl, emailShortBrand } from "@/lib/email-brand-config";
import { sendTransactionalEmail } from "@/lib/mail";
import {
  ORG_ROSTER_SERVER_FIELDS,
  rosterEntryHasLogin,
  type OrganizationTeamRecord,
  type OrgTeamRosterEntry,
} from "@/lib/organization-team-config";
import { hashPassword } from "@/lib/server/password-hash";
import { isAdminEmail } from "@/lib/server/admin-emails";
import { ensureUserIdentificationNumber } from "@/lib/server/user-identification";
import { getOrganizationByWorkEmail } from "@/lib/server/organization-identification";
import { getPurchasesForLearner } from "@/lib/server/get-learner-purchases";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { readOrganizationTeam, writeOrganizationTeam } from "@/lib/server/organization-team-store";

export type OrgOwner = { email: string; companyName: string };

/** Signed-in user must be an organisation account; returns its company name. */
export async function requireOrganisationOwner(email: string): Promise<OrgOwner | null> {
  const normalized = normalizeLearnerEmail(email);
  if (!normalized) return null;
  const user = await prisma.lmsUser.findUnique({
    where: { email: normalized },
    select: { accountType: true, companyName: true },
  });
  if (user?.accountType !== "organisation") return null;
  const org = await getOrganizationByWorkEmail(normalized).catch(() => null);
  const companyName = org?.companyName?.trim() || user.companyName?.trim() || "";
  return { email: normalized, companyName };
}

function stripServerFields(row: OrgTeamRosterEntry): OrgTeamRosterEntry {
  const clean = { ...row };
  for (const key of ORG_ROSTER_SERVER_FIELDS) delete clean[key];
  return clean;
}

/**
 * Browser roster edits must not set login/enrolment markers. Keep the server's markers
 * only while a slot still holds the same email.
 */
export function mergeClientRosterWithServerFields(
  incoming: OrgTeamRosterEntry[],
  existing: OrgTeamRosterEntry[],
): OrgTeamRosterEntry[] {
  const bySlot = new Map(existing.map((r) => [r.slot, r]));
  return incoming.map((row) => {
    const clean = stripServerFields(row);
    const prev = bySlot.get(row.slot);
    if (!prev) return clean;
    const sameEmail = normalizeLearnerEmail(prev.email) === normalizeLearnerEmail(row.email ?? "");
    if (!sameEmail) return clean;
    return {
      ...clean,
      loginCreatedAt: prev.loginCreatedAt,
      loginLinkedAt: prev.loginLinkedAt,
      orgEnrolledSlugs: prev.orgEnrolledSlugs,
    };
  });
}

async function catalogTitles(): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const [courses, programs] = await Promise.all([
    getManagedCourses().catch(() => []),
    getPublishedTutorLedPrograms().catch(() => []),
  ]);
  for (const c of courses) titles.set(canonicalCourseSlug(c.slug), c.title);
  for (const p of programs) titles.set(canonicalCourseSlug(p.slug), p.title);
  return titles;
}

/** Courses the organisation account itself is enrolled in (bought or granted by admin). */
export async function organisationOwnedCourseSlugs(orgEmail: string): Promise<Set<string>> {
  const rows = await getPurchasesForLearner(orgEmail);
  return new Set(rows.map((r) => canonicalCourseSlug(r.slug)));
}

async function removeOrgEnrollment(learnerEmail: string, courseSlug: string): Promise<void> {
  const email = normalizeLearnerEmail(learnerEmail);
  if (!email) return;
  await prisma.lmsPurchase.deleteMany({ where: { learnerEmail: email, courseSlug } });
}

/** Revoke org-granted courses for rows that left the roster or changed email. */
export async function revokeRemovedEmployees(
  before: OrgTeamRosterEntry[],
  after: OrgTeamRosterEntry[],
): Promise<void> {
  const stillThere = new Set(
    after.map((r) => `${r.slot}:${normalizeLearnerEmail(r.email ?? "")}`),
  );
  for (const row of before) {
    if (!row.orgEnrolledSlugs?.length) continue;
    if (stillThere.has(`${row.slot}:${normalizeLearnerEmail(row.email)}`)) continue;
    for (const slug of row.orgEnrolledSlugs) {
      await removeOrgEnrollment(row.email, slug);
    }
  }
}

export type OrgEnrollmentSyncResult = {
  enrolled: number;
  removed: number;
  /** Assigned courses the organisation does not own yet — employees are not enrolled. */
  notOwnedSlugs: string[];
};

/**
 * Turn `courseAssignments` into real enrolments for employees who have a login.
 * Only courses the organisation owns are granted; unassigning removes only
 * enrolments this organisation created.
 */
export async function syncOrganisationEnrollments(orgEmail: string): Promise<{
  team: OrganizationTeamRecord | null;
  result: OrgEnrollmentSyncResult;
}> {
  const result: OrgEnrollmentSyncResult = { enrolled: 0, removed: 0, notOwnedSlugs: [] };
  const team = await readOrganizationTeam(orgEmail);
  if (!team) return { team, result };

  const owned = await organisationOwnedCourseSlugs(orgEmail);
  const titles = await catalogTitles();
  const wantedById = new Map<string, Set<string>>();
  const notOwned = new Set<string>();

  for (const [rawSlug, ids] of Object.entries(team.courseAssignments ?? {})) {
    const slug = canonicalCourseSlug(rawSlug);
    if (!slug || !ids?.length) continue;
    if (!owned.has(slug)) {
      notOwned.add(slug);
      continue;
    }
    for (const id of ids) {
      if (!wantedById.has(id)) wantedById.set(id, new Set());
      wantedById.get(id)!.add(slug);
    }
  }

  let changed = false;
  const roster: OrgTeamRosterEntry[] = [];
  for (const row of team.roster) {
    const email = normalizeLearnerEmail(row.email ?? "");
    if (!row.invited || !email || !rosterEntryHasLogin(row)) {
      roster.push(row);
      continue;
    }
    const wanted = wantedById.get(row.id) ?? new Set<string>();
    const granted = new Set(row.orgEnrolledSlugs ?? []);

    for (const slug of wanted) {
      if (granted.has(slug)) continue;
      const res = await recordPurchasesForLearner({
        learnerEmail: email,
        courses: [{ slug, title: titles.get(slug) || slug }],
        skipPurchaseEmail: true,
      });
      if (res.ok && res.recorded > 0) {
        granted.add(slug);
        result.enrolled += 1;
        changed = true;
      }
    }
    for (const slug of [...granted]) {
      if (wanted.has(slug)) continue;
      await removeOrgEnrollment(email, slug);
      granted.delete(slug);
      result.removed += 1;
      changed = true;
    }
    roster.push({ ...row, orgEnrolledSlugs: [...granted] });
  }

  result.notOwnedSlugs = [...notOwned];
  if (!changed) return { team, result };
  const saved = await writeOrganizationTeam({ ...team, roster, updatedAt: new Date().toISOString() });
  return { team: saved, result };
}

export type EmployeeLoginOutcome =
  | { ok: true; status: "created" | "password-reset" | "linked"; emailSent: boolean; team: OrganizationTeamRecord }
  | { ok: false; status: number; message: string };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function sendEmployeeLoginEmail(input: {
  to: string;
  name: string;
  companyName: string;
  password?: string;
}): Promise<boolean> {
  const loginUrl = `${emailAppUrl().replace(/\/$/, "")}/account?mode=login`;
  const company = input.companyName || "Your organisation";
  const subject = `${company} added you to ${emailShortBrand()} training`;
  const passwordLine = input.password
    ? `Password: ${input.password}`
    : "Password: use your existing password for this email.";
  const text = [
    `Hi ${input.name || "there"},`,
    "",
    `${company} has added you to their team on ${emailAppName()}. Your assigned courses will appear on your dashboard.`,
    "",
    `Login email: ${input.to}`,
    passwordLine,
    "",
    `Sign in here (choose "Individual"): ${loginUrl}`,
    input.password ? "Please keep this password private." : "",
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(input.name || "there")},</p>
    <p><strong>${escapeHtml(company)}</strong> has added you to their team on ${escapeHtml(emailAppName())}.
    Your assigned courses will appear on your dashboard.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Login email</td><td><strong>${escapeHtml(input.to)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Password</td><td><strong>${
        input.password ? escapeHtml(input.password) : "Your existing password"
      }</strong></td></tr>
    </table>
    <p><a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Sign in</a>
    &nbsp;Choose <strong>Individual</strong> on the sign-in page.</p>
    ${input.password ? "<p style=\"color:#666;font-size:12px\">Please keep this password private.</p>" : ""}
  `;
  try {
    await sendTransactionalEmail({ to: input.to, subject, text, html });
    return true;
  } catch (err) {
    console.error("[org-employee-login] email failed", err);
    return false;
  }
}

/**
 * Create (or reset) the employee's learner login with the password the organisation chose.
 * An email that already belongs to someone else is linked, never overwritten.
 */
export async function createEmployeeLogin(input: {
  owner: OrgOwner;
  slot: number;
  password?: string;
}): Promise<EmployeeLoginOutcome> {
  const team = await readOrganizationTeam(input.owner.email);
  const row = team?.roster.find((r) => r.slot === input.slot);
  if (!team || !row) return { ok: false, status: 404, message: "Employee seat not found." };

  const email = normalizeLearnerEmail(row.email ?? "");
  const name = row.name?.trim() ?? "";
  if (!email || !email.includes("@") || !name) {
    return { ok: false, status: 400, message: "Save the employee's name and email first." };
  }
  if (email === input.owner.email) {
    return { ok: false, status: 400, message: "Use the employee's own email, not the organisation email." };
  }
  if (isAdminEmail(email)) {
    return { ok: false, status: 400, message: "This email cannot be used for an employee login." };
  }
  const duplicate = team.roster.some(
    (r) => r.slot !== row.slot && normalizeLearnerEmail(r.email ?? "") === email,
  );
  if (duplicate) return { ok: false, status: 400, message: "This email is already used by another seat." };

  const existing = await prisma.lmsUser.findUnique({
    where: { email },
    select: { id: true, accountType: true, companyName: true },
  });

  let status: "created" | "password-reset" | "linked";
  let emailPassword: string | undefined;

  if (existing && !row.loginCreatedAt) {
    if (existing.accountType === "organisation") {
      return { ok: false, status: 409, message: "This email is registered as an organisation account." };
    }
    if (!existing.companyName?.trim() && input.owner.companyName) {
      await prisma.lmsUser.update({ where: { email }, data: { companyName: input.owner.companyName } });
    }
    status = "linked";
  } else {
    const password = input.password?.trim() ?? "";
    const policy = validateLearnerPassword(password);
    if (!policy.ok) return { ok: false, status: 400, message: policy.message };
    const passwordHash = await hashPassword(password);
    emailPassword = password;

    if (existing) {
      await prisma.lmsUser.update({
        where: { email },
        data: { passwordHash, name, companyName: input.owner.companyName || existing.companyName },
      });
      status = "password-reset";
    } else {
      const period = registrationPeriodFromDate();
      await prisma.lmsUser.create({
        data: {
          email,
          name,
          role: "learner",
          accountType: "individual",
          companyName: input.owner.companyName || null,
          passwordHash,
          emailVerifiedAt: new Date(),
          registrationMonth: period.registrationMonth,
          registrationYear: period.registrationYear,
          registrationMonthYear: period.registrationMonthYear,
        },
      });
      await ensureUserIdentificationNumber(email).catch(() => null);
      status = "created";
    }
  }

  const now = new Date().toISOString();
  const roster = team.roster.map((r) =>
    r.slot === row.slot
      ? {
          ...r,
          ...(status === "linked" ? { loginLinkedAt: now } : { loginCreatedAt: r.loginCreatedAt ?? now }),
        }
      : r,
  );
  await writeOrganizationTeam({ ...team, roster, updatedAt: now });
  const synced = await syncOrganisationEnrollments(input.owner.email);

  const emailSent = await sendEmployeeLoginEmail({
    to: email,
    name,
    companyName: input.owner.companyName,
    password: emailPassword,
  });

  const latest = synced.team ?? (await readOrganizationTeam(input.owner.email));
  return { ok: true, status, emailSent, team: latest ?? team };
}
