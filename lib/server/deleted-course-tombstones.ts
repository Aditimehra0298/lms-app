import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const tombstoneFilePath = path.join(process.cwd(), "data", "deleted-course-slugs.json");

/**
 * Always-hidden slugs. A DATABASE_URL switch or old admin-content.json can
 * otherwise put these back into Admin even after the user deleted them.
 */
export const SEEDED_DELETED_COURSE_SLUGS = [
  "courses-certfied-ethical-hacking-and-penitration-testing",
];

function normalizeSlugs(slugs: Iterable<string | undefined | null>): string[] {
  return [
    ...new Set(
      [...slugs]
        .map((s) => String(s ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

async function readFileTombstones(): Promise<string[]> {
  try {
    const raw = await fs.readFile(tombstoneFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeSlugs(parsed.map((s) => (typeof s === "string" ? s : "")));
  } catch {
    return [];
  }
}

async function writeFileTombstones(slugs: string[]): Promise<void> {
  await fs.mkdir(path.dirname(tombstoneFilePath), { recursive: true });
  const unique = normalizeSlugs(slugs);
  const tmp = `${tombstoneFilePath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, tombstoneFilePath);
  } catch {
    await fs.copyFile(tmp, tombstoneFilePath);
    await fs.unlink(tmp).catch(() => undefined);
  }
}

let tableReady = false;

async function ensureMysqlTombstoneTable(): Promise<boolean> {
  if (tableReady) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS lms_deleted_course (
        slug VARCHAR(191) NOT NULL,
        deletedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (slug)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    tableReady = true;
    return true;
  } catch (err) {
    console.error("[deleted-course-tombstones] ensure table", err);
    return false;
  }
}

async function readMysqlTombstones(): Promise<string[]> {
  if (!(await ensureMysqlTombstoneTable())) return [];
  try {
    const rows = await prisma.$queryRaw<{ slug: string }[]>`
      SELECT slug FROM lms_deleted_course
    `;
    return normalizeSlugs(rows.map((r) => r.slug));
  } catch (err) {
    console.error("[deleted-course-tombstones] read mysql", err);
    return [];
  }
}

/** Union of durable deletes (MySQL + gitignored file). Survives admin-content.json deploys. */
export async function listDeletedCourseSlugs(extra?: Iterable<string>): Promise<string[]> {
  const [fileSlugs, mysqlSlugs] = await Promise.all([readFileTombstones(), readMysqlTombstones()]);
  return normalizeSlugs([
    ...SEEDED_DELETED_COURSE_SLUGS,
    ...(extra ?? []),
    ...fileSlugs,
    ...mysqlSlugs,
  ]);
}

export async function recordDeletedCourseSlugs(slugs: Iterable<string>): Promise<void> {
  const unique = normalizeSlugs(slugs);
  if (unique.length === 0) return;

  const current = await readFileTombstones();
  await writeFileTombstones([...current, ...unique]);

  if (!(await ensureMysqlTombstoneTable())) return;
  for (const slug of unique) {
    try {
      await prisma.$executeRaw`
        INSERT IGNORE INTO lms_deleted_course (slug, deletedAt)
        VALUES (${slug}, NOW(3))
      `;
    } catch (err) {
      console.error("[deleted-course-tombstones] insert", slug, err);
    }
  }
}

/** Call when admin creates/saves a course that was previously deleted (same slug). */
export async function clearDeletedCourseSlugs(slugs: Iterable<string>): Promise<void> {
  const unique = normalizeSlugs(slugs);
  if (unique.length === 0) return;

  const current = await readFileTombstones();
  const keep = current.filter((s) => !unique.includes(s));
  if (keep.length !== current.length) {
    await writeFileTombstones(keep);
  }

  if (!(await ensureMysqlTombstoneTable())) return;
  for (const slug of unique) {
    try {
      await prisma.$executeRaw`DELETE FROM lms_deleted_course WHERE slug = ${slug}`;
    } catch (err) {
      console.error("[deleted-course-tombstones] delete", slug, err);
    }
  }
}

export function isDeletedCourseSlug(
  slug: string | undefined | null,
  deleted: Iterable<string>,
): boolean {
  const key = String(slug ?? "").trim();
  if (!key) return false;
  const set = deleted instanceof Set ? deleted : new Set(normalizeSlugs(deleted));
  return set.has(key);
}
