/**
 * Overlay CEH landing + lesson/exam copy onto the live self-paced course.
 * Keeps all videoUrl / examUploadUrl / durations already on the server.
 *
 * On GCE:
 *   cd /var/www/lms
 *   cp -a data/admin-content.json data/admin-content.json.bak-$(date +%F-%H%M)
 *   node scripts/merge-ceh-landing-keep-media.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(root, "data", "admin-content.json");
const overlayPath = path.join(root, "data", "ceh-landing-overlay.json");
const SLUG = "courses-certfied-ethical-hacking-and-penitration-testing";

function mergeItem(existing, overlay) {
  if (!existing) return existing;
  if (!overlay) return existing;
  return {
    ...existing,
    label: overlay.label || existing.label,
    description: overlay.description ?? existing.description,
    about: overlay.about ?? existing.about,
    learningOutcomes: overlay.learningOutcomes?.length
      ? overlay.learningOutcomes
      : existing.learningOutcomes,
    // never replace media
    videoUrl: existing.videoUrl,
    examUploadUrl: existing.examUploadUrl,
    downloadUrl: existing.downloadUrl,
    pdfUrl: existing.pdfUrl,
    pptUrl: existing.pptUrl,
    lessonDurationMinutes: existing.lessonDurationMinutes,
    previewLimitMinutes: existing.previewLimitMinutes,
    lessonVideoSizeMb: existing.lessonVideoSizeMb,
    examPassingScorePercent: existing.examPassingScorePercent,
    timedExam: existing.timedExam,
    examDurationMinutes: existing.examDurationMinutes,
  };
}

function mergeCurriculum(existingMods, overlayMods) {
  return (existingMods || []).map((mod, mi) => {
    const o = overlayMods?.[mi];
    return {
      ...mod,
      title: o?.title || mod.title,
      description: o?.description ?? mod.description,
      items: (mod.items || []).map((it, ii) => mergeItem(it, o?.items?.[ii])),
      subModules: (mod.subModules || []).map((sm, si) => ({
        ...sm,
        title: o?.subModules?.[si]?.title || sm.title,
        items: (sm.items || []).map((it, ii) => mergeItem(it, o?.subModules?.[si]?.items?.[ii])),
      })),
    };
  });
}

async function main() {
  const overlay = JSON.parse(await fs.readFile(overlayPath, "utf8"));
  const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
  const courses = [...(content.managedCourses || [])];
  const idx = courses.findIndex((c) => c.slug === SLUG);
  if (idx < 0) {
    throw new Error(`Course ${SLUG} not found in admin-content.json`);
  }
  const existing = courses[idx];
  const next = {
    ...existing,
    ...overlay.course,
    slug: existing.slug,
    published: existing.published !== false,
    learningFormat: existing.learningFormat || "self-paced",
    price: existing.price,
    oldPrice: existing.oldPrice,
    basePrice: existing.basePrice,
    regionalPrices: existing.regionalPrices?.length
      ? existing.regionalPrices
      : overlay.course.regionalPrices,
    certificateConfig: {
      ...(existing.certificateConfig || {}),
      ...(overlay.course.certificateConfig || {}),
    },
    hero: {
      ...(existing.hero || {}),
      ...(overlay.course.hero || {}),
    },
    curriculum: mergeCurriculum(existing.curriculum, overlay.curriculum),
  };

  courses[idx] = next;
  content.managedCourses = courses;

  const bak = `${contentPath}.bak-ceh-merge-${Date.now()}`;
  await fs.copyFile(contentPath, bak);
  await fs.writeFile(contentPath, JSON.stringify(content, null, 2), "utf8");

  const mods = next.curriculum?.length ?? 0;
  const media = (next.curriculum || []).reduce((n, m) => {
    return (
      n +
      (m.items || []).filter((i) => i.videoUrl || i.examUploadUrl).length
    );
  }, 0);
  console.log("Merged overlay onto", SLUG);
  console.log("Modules", mods, "· media URLs kept", media);
  console.log("Backup", bak);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
