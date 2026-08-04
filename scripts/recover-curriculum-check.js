/**
 * Run ON THE LIVE SERVER (GCP SSH) from /var/www/lms:
 *   node scripts/recover-curriculum-check.js
 *
 * Checks whether MySQL or JSON backups still hold richer curricula for
 * Carbon Trading (expected ~22) and ESG Management Development (~15+).
 */
const fs = require("fs");
const path = require("path");

const TARGETS = [
  "essentials-of-carbon-trading-and-reporting",
  "esg-management-development-training-program",
  "cousers-esg-esg-management-development-training-program",
];

function score(mods) {
  if (!Array.isArray(mods)) return { modules: 0, videos: 0 };
  let videos = 0;
  for (const m of mods) {
    const rows = [
      ...(m.items || []),
      ...((m.subModules || []).flatMap((s) => s.items || [])),
    ];
    for (const i of rows) if (i.videoUrl) videos += 1;
  }
  return { modules: mods.length, videos };
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  console.log("=== JSON catalog / backups ===");
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("admin-content.json"))
    .map((f) => path.join(dataDir, f));

  for (const file of files) {
    const j = loadJson(file);
    if (!j) continue;
    console.log("\nFile:", path.basename(file));
    for (const slug of TARGETS) {
      const c = (j.managedCourses || []).find((x) => x.slug === slug);
      if (!c) {
        console.log("  ", slug, "— missing");
        continue;
      }
      const s = score(c.curriculum);
      console.log("  ", slug, `→ ${s.modules} modules, ${s.videos} videos`);
    }
  }

  console.log("\n=== MySQL lms_course_content ===");
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    for (const slug of TARGETS) {
      const row = await prisma.lmsCourseContent.findUnique({ where: { courseSlug: slug } });
      const mods = row?.payload?.curriculum;
      const s = score(mods);
      console.log(" ", slug, `→ ${s.modules} modules, ${s.videos} videos`);
      if (s.modules > 0) {
        (mods || []).forEach((m, i) => console.log("   ", i + 1, m.title));
      }
    }
    await prisma.$disconnect();
  } catch (e) {
    console.log(" MySQL check failed:", e.message);
  }

  console.log("\n=== Orphan video filenames (storage/private/admin) ===");
  const mediaRoot = path.join(process.cwd(), "storage", "private", "admin");
  if (fs.existsSync(mediaRoot)) {
    const names = fs.readdirSync(mediaRoot);
    const hints = names.filter((n) =>
      /CCTS|CCTR|carbon|Module_|ESG|GEI/i.test(n),
    );
    console.log(" Matching files:", hints.length);
    hints
      .sort()
      .slice(0, 80)
      .forEach((n) => console.log("  ", n));
    if (hints.length > 80) console.log("  …", hints.length - 80, "more");
  } else {
    console.log(" No storage/private/admin folder found");
  }

  console.log(
    "\nIf MySQL modules > JSON modules, restore with:\n" +
      "  curl -X POST https://sftlms.com/api/admin/course-curriculum/restore-from-mysql \\\n" +
      "    -H 'Content-Type: application/json' -H 'x-admin-email: YOUR_ADMIN_EMAIL' \\\n" +
      "    -d '{\"slug\":\"essentials-of-carbon-trading-and-reporting\"}'\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
