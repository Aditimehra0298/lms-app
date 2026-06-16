/**
 * Mark all module exams passed + modules complete for a learner (server progress file + certificate).
 *
 * Usage:
 *   node --env-file=.env.local scripts/complete-learner-module-exams.mjs [email] [courseSlug]
 *
 * Example:
 *   node --env-file=.env.local scripts/complete-learner-module-exams.mjs aditimehra0298@gmail.com cyber-security-phishing-awareness-training
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const learnerEmail = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();
const courseSlug = (process.argv[3] || "cyber-security-phishing-awareness-training").trim().toLowerCase();

const SLUG_ALIASES = { cybersecurity: "cyber-security-phishing-awareness-training" };
const canonicalSlug = (s) => SLUG_ALIASES[s] ?? s;

const PROGRESS_PATH = path.join(process.cwd(), "data", "learner-course-progress.json");

function getFirstExamRow(mod) {
  const top = mod.items?.find((i) => i.kind === "exam");
  if (top) return top;
  for (const sm of mod.subModules ?? []) {
    const row = sm.items?.find((i) => i.kind === "exam");
    if (row) return row;
  }
  return undefined;
}

function moduleHasContent(mod) {
  const items = [
    ...(mod.items ?? []),
    ...(mod.subModules ?? []).flatMap((sm) => sm.items ?? []),
  ];
  return items.some(
    (i) =>
      i.videoUrl?.trim() ||
      i.examUploadUrl?.trim() ||
      i.pdfUrl?.trim() ||
      i.description?.trim(),
  );
}

function examModuleNumbers(curriculum) {
  const out = [];
  curriculum.forEach((mod, idx) => {
    if (getFirstExamRow(mod)) out.push(idx + 1);
  });
  return out;
}

async function loadCurriculum(slug) {
  try {
    const res = await fetch(`${baseUrl}/api/courses/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.curriculum) && data.curriculum.length > 0) {
        return { curriculum: data.curriculum, title: data.title || slug };
      }
    }
  } catch {
    // fall through to admin-content.json
  }

  const raw = await readFile(path.join(process.cwd(), "data", "admin-content.json"), "utf8");
  const content = JSON.parse(raw);
  const course = content.managedCourses?.find((c) => c.slug === slug);
  if (!course?.curriculum?.length) {
    throw new Error(`Course not found: ${slug}`);
  }
  const filtered = course.curriculum.filter(moduleHasContent);
  return {
    curriculum: filtered.length > 0 ? filtered : course.curriculum,
    title: course.title || slug,
  };
}

function buildPassedScore() {
  return {
    correct: 10,
    total: 10,
    percent: 100,
    passed: true,
    updatedAt: new Date().toISOString(),
  };
}

async function upsertProgress(slug, moduleCount, examModules) {
  const completedModules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const examScores = {};
  for (const n of examModules) {
    examScores[String(n)] = buildPassedScore();
  }

  let store = { learners: {} };
  try {
    store = JSON.parse(await readFile(PROGRESS_PATH, "utf8"));
  } catch {
  }
  if (!store.learners || typeof store.learners !== "object") store.learners = {};
  if (!store.learners[learnerEmail]) store.learners[learnerEmail] = {};

  store.learners[learnerEmail][slug] = {
    completedModules,
    examScores,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
  await writeFile(PROGRESS_PATH, JSON.stringify(store, null, 2), "utf8");

  return { completedModules, examScores };
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function ensureCertificate(slug, courseTitle) {
  try {
    const bypass = await postJson(
      `${baseUrl}/api/admin/courses/${encodeURIComponent(slug)}/students/actions`,
      { learnerEmail, action: "bypass-access" },
    );
    console.log(`[enroll] ${bypass.status}`, bypass.data.message || bypass.data);

    const manual = await postJson(
      `${baseUrl}/api/admin/courses/${encodeURIComponent(slug)}/students/actions`,
      { learnerEmail, action: "manual-certificate-pass" },
    );
    console.log(`[certificate] ${manual.status}`, manual.data.message || manual.data);
    return;
  } catch (err) {
    console.warn("[certificate] API unavailable, using database fallback:", err.message);
  }

  let user = await prisma.lmsUser.findUnique({
    where: { email: learnerEmail },
    select: { id: true, name: true },
  });
  if (!user) {
    const displayName =
      learnerEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Learner";
    user = await prisma.lmsUser.create({
      data: {
        email: learnerEmail,
        name: displayName,
        role: "learner",
        accountType: "individual",
        emailVerifiedAt: new Date(),
      },
      select: { id: true, name: true },
    });
  }

  const existingPurchase = await prisma.lmsPurchase.findFirst({
    where: { learnerEmail, courseSlug: slug },
    select: { id: true },
  });
  if (!existingPurchase) {
    const dbCourse = await prisma.lmsCourse.findUnique({
      where: { slug },
      select: { id: true },
    });
    await prisma.lmsPurchase.create({
      data: {
        learnerEmail,
        courseSlug: slug,
        title: courseTitle,
        courseId: dbCourse?.id ?? null,
        userId: user.id,
      },
    });
    console.log("[enroll] Created purchase row in database");
  }

  let cert = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail, courseSlug: slug },
    orderBy: { issuedAt: "desc" },
    select: { id: true },
  });

  if (!cert) {
    const certNumber = `SFT-DEMO-${slug.slice(0, 8).toUpperCase()}-${Date.now()}`;
    cert = await prisma.lmsCertificate.create({
      data: {
        learnerEmail,
        learnerName: user.name || learnerEmail.split("@")[0] || "Learner",
        courseSlug: slug,
        courseTitle,
        certificateNumber: certNumber,
        status: "ready",
        visibleToLearner: true,
        scorePercent: 100,
        issuedAt: new Date(),
      },
      select: { id: true },
    });
    console.log("[certificate] Created certificate:", cert.id);
  } else {
    await prisma.lmsCertificate.update({
      where: { id: cert.id },
      data: { status: "ready", visibleToLearner: true, scorePercent: 100 },
    });
    console.log("[certificate] Updated certificate:", cert.id);
  }
}

async function main() {
  const slug = canonicalSlug(courseSlug);
  console.log("Complete module exams for learner");
  console.log("  Email:", learnerEmail);
  console.log("  Course:", slug);
  console.log("");

  const { curriculum, title } = await loadCurriculum(slug);
  const moduleCount = curriculum.length;
  const examModules = examModuleNumbers(curriculum);

  console.log(`[course] ${title}`);
  console.log(`[course] ${moduleCount} modules, ${examModules.length} assessments at modules:`, examModules.join(", "));

  const progress = await upsertProgress(slug, moduleCount, examModules);
  console.log("[progress] Saved to data/learner-course-progress.json");

  try {
    await ensureCertificate(slug, title);
  } catch (err) {
    console.warn("[certificate] Failed:", err.message);
  }

  const storageLines = [
    `// Optional: paste in browser console if sync API is unavailable`,
    `localStorage.setItem("sft_completed_modules_${slug}", ${JSON.stringify(JSON.stringify(progress.completedModules))});`,
    `localStorage.setItem("sft_module_exam_scores_${slug}", ${JSON.stringify(JSON.stringify(progress.examScores))});`,
    `localStorage.setItem("sft_cert_requested_${slug}", "1");`,
    `window.dispatchEvent(new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: "${slug}" } }));`,
    `window.dispatchEvent(new Event("sft_purchases_updated"));`,
    `location.href = "/my-learning/course/${slug}#credentials";`,
  ];

  console.log("\n--- Done ---");
  console.log(`Open (hard refresh): ${baseUrl}/my-learning/course/${slug}#credentials`);
  console.log("\nBrowser fallback (DevTools console):\n");
  console.log(storageLines.join("\n"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
