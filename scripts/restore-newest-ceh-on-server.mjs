/**
 * Find the newest designed CEH course on this server (JSON backups + MySQL)
 * and restore it. Skips the old 85-module leftover.
 *
 *   cd /var/www/lms
 *   node --env-file=.env.local scripts/restore-newest-ceh-on-server.mjs
 *   node --env-file=.env.local scripts/restore-newest-ceh-on-server.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const SLUGS = new Set([
  "courses-certfied-ethical-hacking-and-penitration-testing",
  "certified-ethical-hacking-and-penetration-testing",
]);

function mediaCount(course) {
  let n = 0;
  for (const m of course?.curriculum ?? []) {
    const rows = [...(m.items ?? []), ...((m.subModules ?? []).flatMap((s) => s.items ?? []))];
    for (const item of rows) {
      if (item.videoUrl || item.examUploadUrl || item.pdfUrl || item.downloadUrl) n += 1;
    }
  }
  return n;
}

function designScore(course) {
  const mods = course?.curriculum ?? [];
  const first = String(mods[0]?.title ?? "").toLowerCase();
  const second = String(mods[1]?.title ?? "").toLowerCase();
  const media = mediaCount(course);
  if (mods.length === 0) return 0;
  if (first.includes("general instructions for candidate")) return 1;
  if (second.includes("ethical hacking foundations")) return 1;
  if (mods.length <= 15 && media === 0) return 1;
  return mods.length * 1000 + media;
}

function isOldLeftover(course) {
  return designScore(course) <= 1;
}

function summarize(course, source, when) {
  return {
    source,
    when,
    slug: course.slug,
    category: course.category,
    modules: course.curriculum?.length ?? 0,
    leftover: isOldLeftover(course),
    title: course.title,
    firstModule: course.curriculum?.[0]?.title ?? "",
    course,
  };
}

function findInJson(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const courses = Array.isArray(json.managedCourses) ? json.managedCourses : json.slug ? [json] : [];
    const course = courses.find((c) => SLUGS.has(String(c.slug || "").trim()));
    if (!course) return null;
    return summarize(course, filePath, stat.mtime.toISOString());
  } catch {
    return null;
  }
}

const hits = [];
const dataDir = path.join(root, "data");
for (const name of fs.readdirSync(dataDir)) {
  if (!name.includes("admin-content") && !name.startsWith("ceh-")) continue;
  if (!name.endsWith(".json") && !name.includes(".bak")) continue;
  const hit = findInJson(path.join(dataDir, name));
  if (hit) hits.push(hit);
}

const prisma = new PrismaClient();
try {
  const rows = await prisma.lmsCourseContent.findMany({
    where: { courseSlug: { in: [...SLUGS] } },
    orderBy: { updatedAt: "desc" },
  });
  for (const row of rows) {
    if (!row.payload || typeof row.payload !== "object") continue;
    hits.push(
      summarize(
        { ...row.payload, slug: row.courseSlug },
        `mysql:${row.courseSlug}`,
        row.updatedAt.toISOString(),
      ),
    );
  }
} catch (err) {
  console.log("MySQL read skipped:", err instanceof Error ? err.message : err);
}

hits.sort((a, b) => String(b.when).localeCompare(String(a.when)));
console.log(`Found ${hits.length} CEH copies:\n`);
for (const h of hits) {
  console.log(
    `${h.leftover ? "OLD " : "NEW "} ${h.when} | ${h.modules} modules | ${h.category} | ${h.source}`,
  );
  console.log(`     ${h.title}`);
  console.log(`     first: ${h.firstModule}\n`);
}

const jsonPath = path.join(dataDir, "admin-content.json");
const chosen = [...hits].sort((a, b) => {
  const score = designScore(b.course) - designScore(a.course);
  if (score !== 0) return score;
  return String(b.when).localeCompare(String(a.when));
})[0];
if (!chosen) {
  console.log("No CEH copy found.");
  await prisma.$disconnect();
  process.exit(1);
}

console.log(
  "Chosen:",
  chosen.leftover ? "thin template" : "designed copy",
  chosen.source,
  `${designScore(chosen.course)} score`,
);

if (!apply) {
  console.log("Dry run. Re-run with --apply to write this into admin-content.json.");
  await prisma.$disconnect();
  process.exit(chosen.leftover ? 2 : 0);
}

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const courses = [...(json.managedCourses ?? [])];
const next = {
  ...chosen.course,
  slug: chosen.course.slug || "courses-certfied-ethical-hacking-and-penitration-testing",
  category: "cyber-security",
  published: true,
};
const idx = courses.findIndex((c) => SLUGS.has(String(c.slug || "").trim()));
if (idx >= 0) courses[idx] = { ...courses[idx], ...next };
else courses.push(next);
json.managedCourses = courses;
json.deletedCourseSlugs = (json.deletedCourseSlugs ?? []).filter((s) => !SLUGS.has(String(s || "").trim()));
fs.copyFileSync(jsonPath, `${jsonPath}.bak-ceh-restore-${Date.now()}`);
fs.writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
console.log("Wrote", jsonPath);
await prisma.$disconnect();
