import type { AdminContent } from "@/lib/content-schema";
import { emailAppName, emailAppUrl } from "@/lib/email-brand-config";
import { sendTransactionalEmail } from "@/lib/mail";
import { isOrgAllAccessActive } from "@/lib/organization-team-config";
import { readAllOrganizationTeams } from "@/lib/server/organization-team-store";

type CourseRef = { slug: string; title: string };

export function publishedSelfPacedCourses(content: Partial<AdminContent> | null | undefined): Map<string, CourseRef> {
  const out = new Map<string, CourseRef>();
  for (const c of content?.managedCourses ?? []) {
    if (!c?.slug || c.published === false) continue;
    if ((c.learningFormat?.trim() || "self-paced") !== "self-paced") continue;
    out.set(c.slug, { slug: c.slug, title: c.title || c.slug });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Email organisations on an active all-access subscription about newly published self-paced courses. */
export async function notifyOrganisationsOfNewCourses(courses: CourseRef[]): Promise<void> {
  if (courses.length === 0) return;
  const teams = (await readAllOrganizationTeams()).filter((t) => isOrgAllAccessActive(t));
  if (teams.length === 0) return;

  const base = emailAppUrl().replace(/\/$/, "");
  const subject =
    courses.length === 1
      ? `New course in your team plan: ${courses[0].title}`
      : `${courses.length} new courses added to your team plan`;
  const text = [
    "Hello,",
    "",
    `New self-paced course${courses.length === 1 ? " has" : "s have"} been added to your ${emailAppName()} team subscription:`,
    ...courses.map((c) => `• ${c.title} — ${base}/courses/${c.slug}`),
    "",
    `Assign ${courses.length === 1 ? "it" : "them"} to your employees: ${base}/my-learning?tab=assign-courses`,
  ].join("\n");
  const html = `
    <p>Hello,</p>
    <p>New self-paced course${courses.length === 1 ? " has" : "s have"} been added to your ${escapeHtml(emailAppName())} team subscription:</p>
    <ul>${courses.map((c) => `<li><a href="${base}/courses/${encodeURIComponent(c.slug)}">${escapeHtml(c.title)}</a></li>`).join("")}</ul>
    <p><a href="${base}/my-learning?tab=assign-courses" style="display:inline-block;background:#f59e0b;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Assign to employees</a></p>
  `;

  for (const team of teams) {
    await sendTransactionalEmail({ to: team.workEmail, subject, text, html }).catch((err) =>
      console.error("[org-new-course-notify]", team.workEmail, err),
    );
  }
}
