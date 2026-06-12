import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { sanitizeCertificateConfig } from "@/lib/course-certificate-config";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  AdminContent,
  defaultAdminContent,
  type ManagedCourse,
  defaultAboutPageConfig,
  defaultCoursesPageConfig,
  defaultHomePageConfig,
  type AboutPageTeamLevel,
} from "@/lib/content-schema";
import { mergeOrganizationTeamAdminConfig } from "@/lib/organization-team-config";

const contentFilePath = path.join(process.cwd(), "data", "admin-content.json");

async function ensureContentFile() {
  const dir = path.dirname(contentFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(contentFilePath);
  } catch {
    await fs.writeFile(contentFilePath, JSON.stringify(defaultAdminContent, null, 2), "utf8");
  }
}

function migrateCoursesPage(cfg: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cfg as any;
  if (Array.isArray(c.liveSessions) && !Array.isArray(c.tutorLed)) {
    c.tutorLed = c.liveSessions;
    delete c.liveSessions;
  }
  return c;
}

function migrateAboutPage(cfg: ReturnType<typeof Object.assign>) {
  if (Array.isArray(cfg.teamHierarchy)) {
    cfg.teamHierarchy = cfg.teamHierarchy.map((tier: AboutPageTeamLevel & { members: unknown[] }) => ({
      ...tier,
      members: tier.members.map((m: unknown) => {
        if (typeof m === "string") {
          const [name, role] = m.split(" - ");
          return { name: name.trim(), role: (role ?? "").trim(), photo: "" };
        }
        return m;
      }),
    }));
  }
  return cfg;
}

/** Sanitize per-course certificate config (template, badge, transcript per course/program). */
function migrateManagedCourses(courses: ManagedCourse[]): ManagedCourse[] {
  return courses.map((c) => ({
    ...c,
    certificateConfig: sanitizeCertificateConfig(c.certificateConfig),
  }));
}

function migrateTutorLedPrograms(programs: TutorLedProgramStored[]): TutorLedProgramStored[] {
  return programs.map((p) => ({
    ...p,
    certificateConfig: sanitizeCertificateConfig(p.certificateConfig),
  }));
}

async function readAdminContentFromDisk(): Promise<AdminContent> {
  await ensureContentFile();
  const raw = await fs.readFile(contentFilePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as AdminContent;
    return {
      dashboard: {
        ...defaultAdminContent.dashboard,
        ...(parsed.dashboard ?? {}),
        calendarReminders: Array.isArray(parsed.dashboard?.calendarReminders)
          ? parsed.dashboard.calendarReminders
          : defaultAdminContent.dashboard.calendarReminders ?? [],
        communityConnect: Array.isArray(parsed.dashboard?.communityConnect)
          ? parsed.dashboard.communityConnect
          : defaultAdminContent.dashboard.communityConnect ?? [],
      },
      learningCourses:
        parsed.learningCourses && parsed.learningCourses.length > 0
          ? parsed.learningCourses
          : defaultAdminContent.learningCourses,
      managedCourses:
        parsed.managedCourses && parsed.managedCourses.length > 0
          ? migrateManagedCourses(parsed.managedCourses)
          : defaultAdminContent.managedCourses,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : defaultAdminContent.categories,
      categoryPages:
        parsed.categoryPages && typeof parsed.categoryPages === "object"
          ? parsed.categoryPages
          : {},
      coursesPage: parsed.coursesPage
        ? migrateCoursesPage({ ...defaultCoursesPageConfig, ...parsed.coursesPage })
        : defaultCoursesPageConfig,
      homePage: parsed.homePage
        ? { ...defaultHomePageConfig, ...parsed.homePage }
        : defaultHomePageConfig,
      aboutPage: parsed.aboutPage
        ? migrateAboutPage({ ...defaultAboutPageConfig, ...parsed.aboutPage })
        : defaultAboutPageConfig,
      tutorLedPrograms:
        Array.isArray(parsed.tutorLedPrograms) && parsed.tutorLedPrograms.length > 0
          ? migrateTutorLedPrograms(parsed.tutorLedPrograms)
          : defaultAdminContent.tutorLedPrograms,
      globalCertificateAssets:
        parsed.globalCertificateAssets && typeof parsed.globalCertificateAssets === "object"
          ? parsed.globalCertificateAssets
          : undefined,
      organizationTeam: mergeOrganizationTeamAdminConfig(parsed.organizationTeam),
    };
  } catch {
    return defaultAdminContent;
  }
}

/** One disk read per server request (deduped across parallel catalog calls). */
export const readAdminContent = cache(readAdminContentFromDisk);

export async function writeAdminContent(content: AdminContent): Promise<void> {
  await ensureContentFile();
  await fs.writeFile(contentFilePath, JSON.stringify(content, null, 2), "utf8");
}
