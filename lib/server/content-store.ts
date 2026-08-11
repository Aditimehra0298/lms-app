import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { sanitizeCertificateConfig } from "@/lib/course-certificate-config";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  AdminContent,
  defaultAdminContent,
  type CategoryTone,
  type ManagedCategory,
  type ManagedCourse,
  defaultAboutPageConfig,
  defaultCoursesPageConfig,
  defaultHomePageConfig,
  type AboutPageTeamLevel,
} from "@/lib/content-schema";
import { mergeOrganizationTeamAdminConfig } from "@/lib/organization-team-config";
import { defaultPromotions, sanitizePromotions } from "@/lib/promotions";

const contentFilePath = path.join(process.cwd(), "data", "admin-content.json");

const CATEGORY_TONES = new Set<CategoryTone>(["violet", "blue", "emerald", "amber"]);

/**
 * Older saves / manual edits sometimes used `name` / `status` instead of
 * `title` / `isActive`. Normalize so admin renames and Explore never blank out.
 */
export function normalizeManagedCategories(raw: unknown): ManagedCategory[] {
  if (!Array.isArray(raw)) return defaultAdminContent.categories;
  return raw.map((item, index) => {
    const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const slugRaw = typeof c.slug === "string" ? c.slug.trim() : "";
    const titleRaw =
      (typeof c.title === "string" && c.title.trim()) ||
      (typeof c.name === "string" && c.name.trim()) ||
      "";
    const slug =
      slugRaw ||
      titleRaw
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `category-${index + 1}`;
    const status = typeof c.status === "string" ? c.status : "";
    const isActive =
      typeof c.isActive === "boolean" ? c.isActive : status !== "Draft";
    const tone =
      typeof c.tone === "string" && CATEGORY_TONES.has(c.tone as CategoryTone)
        ? (c.tone as CategoryTone)
        : "violet";
    return {
      slug,
      title: titleRaw || slug,
      subtitle: typeof c.subtitle === "string" && c.subtitle.trim() ? c.subtitle : "General",
      description:
        typeof c.description === "string" && c.description.trim()
          ? c.description
          : "Category description",
      isActive,
      isFeatured: Boolean(c.isFeatured),
      isUppercase: Boolean(c.isUppercase),
      isBold: Boolean(c.isBold),
      tone,
    };
  });
}

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
      managedCourses: Array.isArray(parsed.managedCourses)
        ? migrateManagedCourses(parsed.managedCourses)
        : defaultAdminContent.managedCourses,
      deletedCourseSlugs: Array.isArray(parsed.deletedCourseSlugs)
        ? [...new Set(parsed.deletedCourseSlugs.map((s) => String(s ?? "").trim()).filter(Boolean))]
        : [],
      categories: normalizeManagedCategories(parsed.categories),
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
      promotions: parsed.promotions
        ? sanitizePromotions(parsed.promotions)
        : defaultPromotions,
    };
  } catch {
    return defaultAdminContent;
  }
}

/** One disk read per server request (deduped across parallel catalog calls). */
export const readAdminContent = cache(readAdminContentFromDisk);

/** Uncached disk read — use for admin GET/PUT so saves are never served stale. */
export { readAdminContentFromDisk };

export async function writeAdminContent(content: AdminContent): Promise<void> {
  await ensureContentFile();
  const normalized: AdminContent = {
    ...content,
    categories: normalizeManagedCategories(content.categories),
    categoryPages:
      content.categoryPages && typeof content.categoryPages === "object"
        ? content.categoryPages
        : {},
  };

  // Keep rolling backups before overwrite so accidental curriculum wipes can be restored.
  try {
    const prev = await fs.readFile(contentFilePath, "utf8");
    if (prev.trimStart().startsWith("{") && prev.length > 50) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const bakPath = `${contentFilePath}.bak`;
      const stamped = `${contentFilePath}.bak.${stamp}`;
      await fs.writeFile(bakPath, prev, "utf8");
      await fs.writeFile(stamped, prev, "utf8").catch(() => undefined);
      const dir = path.dirname(contentFilePath);
      const base = path.basename(contentFilePath);
      const entries = await fs.readdir(dir);
      const stampedBaks = entries
        .filter((n) => n.startsWith(`${base}.bak.`) && n !== `${base}.bak`)
        .sort()
        .reverse();
      for (const old of stampedBaks.slice(20)) {
        await fs.unlink(path.join(dir, old)).catch(() => undefined);
      }
    }
  } catch {
    // First write / missing file — no prior snapshot.
  }

  const payload = JSON.stringify(normalized, null, 2);
  const tmp = `${contentFilePath}.tmp`;
  await fs.writeFile(tmp, payload, "utf8");
  try {
    await fs.rename(tmp, contentFilePath);
  } catch {
    // Windows: cannot rename over existing file — replace explicitly.
    await fs.copyFile(tmp, contentFilePath);
    await fs.unlink(tmp).catch(() => undefined);
  }
  // Confirm the write landed (catches silent Windows lock / wrong cwd issues).
  const verify = await fs.readFile(contentFilePath, "utf8");
  if (verify.length < 2 || !verify.trimStart().startsWith("{")) {
    throw new Error("admin-content.json write verification failed");
  }
}
