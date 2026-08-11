#!/usr/bin/env node
/**
 * Restore courses that exist in MySQL but are missing from data/admin-content.json.
 * Typical cause: git reset --hard replaced the live JSON with GitHub's older copy.
 *
 * Run on the GCE VM:
 *   cd /var/www/lms && node --env-file=.env.local scripts/restore-mysql-courses-into-json.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "admin-content.json");
const prisma = new PrismaClient();

function stub(row) {
  const format = String(row.learningFormat || "")
    .trim()
    .toLowerCase();
  return {
    slug: row.slug.trim(),
    title: row.title.trim() || row.slug,
    subtitle: row.subtitle || "",
    category: row.category || "",
    level: row.level || "Beginner",
    duration: "3h 00m",
    rating: "4.6",
    learners: "0",
    price: "$49.00",
    oldPrice: "$79.00",
    image: "",
    published: row.published !== false,
    learningFormat: format === "interactive" || format === "live" ? format : "self-paced",
  };
}

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const courses = Array.isArray(json.managedCourses) ? [...json.managedCourses] : [];
const have = new Set(courses.map((c) => String(c.slug || "").trim()).filter(Boolean));
const added = [];

const rows = await prisma.lmsCourse.findMany({
  include: { content: true },
  orderBy: { updatedAt: "desc" },
});

for (const row of rows) {
  const slug = String(row.slug || "").trim();
  if (!slug || have.has(slug)) continue;
  const payload =
    row.content?.payload && typeof row.content.payload === "object" ? row.content.payload : null;
  const next = payload
    ? { ...stub(row), ...payload, slug, title: payload.title || row.title }
    : stub(row);
  courses.push(next);
  have.add(slug);
  added.push(`${row.title} (${slug})`);
}

console.log(`JSON had ${have.size - added.length} courses; MySQL has ${rows.length}; adding ${added.length}`);
for (const line of added) console.log(" +", line);

const hits = courses.filter((c) => /14001|lead auditor/i.test(`${c.title} ${c.slug}`));
console.log("--- ISO 14001 / Lead Auditor ---");
for (const c of hits) {
  console.log(` ${c.slug} | ${c.title} | format=${c.learningFormat || "(blank)"} | cat=${c.category || ""}`);
}

if (added.length) {
  fs.copyFileSync(jsonPath, `${jsonPath}.pre-mysql-restore`);
  json.managedCourses = courses;
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  console.log("Wrote", jsonPath);
} else {
  console.log("Nothing missing from JSON. If the course is still hidden, clear the category filter and search “Lead Auditor”.");
}

await prisma.$disconnect();
