/**
 * Demo: enroll a learner, issue ready certificates with PDFs, mark courses complete in browser storage.
 *
 * Usage:
 *   node --env-file=.env.local scripts/demo-complete-course.mjs
 *   node --env-file=.env.local scripts/demo-complete-course.mjs slug1,slug2 learner@email.com
 *
 * Default: advanced-cyber-security-professional + cybersecurity (two completed certs for senior demo)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const DEFAULT_SLUGS = ["advanced-cyber-security-professional", "cybersecurity"];
const courseSlugs = (process.argv[2] || DEFAULT_SLUGS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const learnerEmail = (process.argv[3] || process.env.MAIN_ADMIN_EMAIL || "learner@example.com")
  .trim()
  .toLowerCase();

const CERT_DIR = path.join(process.cwd(), "storage", "private", "certificates");
const REGISTRATION_ID_START = 101;

async function ensureLearnerUser(email) {
  const normalized = email.trim().toLowerCase();
  const displayName =
    normalized.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Learner";

  let user = await prisma.lmsUser.findUnique({
    where: { email: normalized },
    select: { id: true, identificationNumber: true },
  });

  if (!user) {
    user = await prisma.lmsUser.create({
      data: {
        email: normalized,
        name: displayName,
        role: "learner",
        accountType: "individual",
        emailVerifiedAt: new Date(),
      },
      select: { id: true, identificationNumber: true },
    });
    console.log(`[user] Created learner account for ${normalized}`);
  }

  if (user.identificationNumber == null) {
    const agg = await prisma.lmsUser.aggregate({ _max: { identificationNumber: true } });
    const next = Math.max(
      REGISTRATION_ID_START,
      (agg._max.identificationNumber ?? REGISTRATION_ID_START - 1) + 1,
    );
    user = await prisma.lmsUser.update({
      where: { id: user.id },
      data: { identificationNumber: next },
      select: { id: true, identificationNumber: true },
    });
    console.log(`[user] Assigned learner ID ${next}`);
  }

  return user;
}

const DEMO_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "5 0 obj<</Length 44>>stream",
    "BT /F1 24 Tf 72 720 Td (SF Trainings Certificate) Tj ET",
    "endstream",
    "endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000266 00000 n ",
    "0000000334 00000 n ",
    "trailer<</Size 6/Root 1 0 R>>",
    "startxref",
    "427",
    "%%EOF",
  ].join("\n"),
  "utf8",
);

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

async function getCourseMeta(slug) {
  const res = await fetch(`${baseUrl}/api/courses/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Course ${slug} not found (${res.status})`);
  return res.json();
}

async function setupCourse(slug) {
  const course = await getCourseMeta(slug);
  const moduleCount = Array.isArray(course.curriculum) && course.curriculum.length > 0
    ? course.curriculum.length
    : 3;
  const courseTitle = course.title || slug;

  const bypass = await postJson(
    `${baseUrl}/api/admin/courses/${encodeURIComponent(slug)}/students/actions`,
    { learnerEmail, action: "bypass-access" },
  );
  console.log(`[${slug}] Enroll:`, bypass.status, bypass.data.message || bypass.data);

  const manual = await postJson(
    `${baseUrl}/api/admin/courses/${encodeURIComponent(slug)}/students/actions`,
    { learnerEmail, action: "manual-certificate-pass" },
  );
  console.log(`[${slug}] Certificate:`, manual.status, manual.data.message || manual.data);

  const cert = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail, courseSlug: slug },
    orderBy: { issuedAt: "desc" },
  });
  if (!cert) {
    throw new Error(`Certificate row was not created for ${slug}. Check MySQL / db:push.`);
  }

  await mkdir(CERT_DIR, { recursive: true });
  const pdfPath = path.join(CERT_DIR, `${cert.id}.pdf`);
  await writeFile(pdfPath, DEMO_PDF);

  const pdfUrl = `/api/certificates/${encodeURIComponent(cert.id)}/pdf`;
  const scorePercent = slug.includes("advanced") ? 94 : 88;
  await prisma.lmsCertificate.update({
    where: { id: cert.id },
    data: {
      status: "ready",
      visibleToLearner: true,
      pdfUrl,
      scorePercent,
    },
  });

  const examScores = {};
  for (let i = 1; i <= moduleCount; i++) {
    examScores[String(i)] = {
      correct: 10,
      total: 10,
      percent: 100,
      passed: true,
      updatedAt: new Date().toISOString(),
    };
  }

  const purchasedRow = {
    slug,
    title: courseTitle,
    modules: moduleCount,
    duration: course.duration || "2h 00m",
    completed: moduleCount,
    status: "Completed",
    action: "View Certificate",
    tone: "emerald",
    deliveryKind: "managed",
    image: course.certificatePreviewImage || "/p2.png",
  };

  return {
    slug,
    cert,
    purchasedRow,
    moduleCount,
    examScores,
    scorePercent,
  };
}

async function main() {
  console.log("Demo — completed courses + certificates");
  console.log("  Courses:", courseSlugs.join(", "));
  console.log("  Learner:", learnerEmail);
  console.log("  LMS:", baseUrl);
  console.log("");

  await ensureLearnerUser(learnerEmail);

  const results = [];
  for (const slug of courseSlugs) {
    results.push(await setupCourse(slug));
  }

  const purchasedRows = results.map((r) => r.purchasedRow);
  const learnerName =
    learnerEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Learner";
  const storageLines = [
    `localStorage.setItem("sft_logged_in", "true");`,
    `localStorage.setItem("sft_learner_email", "${learnerEmail}");`,
    `localStorage.setItem("sft_learner_name", "${learnerName}");`,
    `localStorage.setItem("sft_purchased_courses", ${JSON.stringify(JSON.stringify(purchasedRows))});`,
  ];

  for (const r of results) {
    storageLines.push(
      `localStorage.setItem("sft_completed_modules_${r.slug}", ${JSON.stringify(
        JSON.stringify(Array.from({ length: r.moduleCount }, (_, i) => i + 1)),
      )});`,
    );
    storageLines.push(
      `localStorage.setItem("sft_module_exam_scores_${r.slug}", ${JSON.stringify(
        JSON.stringify(r.examScores),
      )});`,
    );
    storageLines.push(`localStorage.setItem("sft_cert_requested_${r.slug}", "1");`);
  }

  storageLines.push(`window.dispatchEvent(new Event("sft_auth_updated"));`);
  storageLines.push(`window.dispatchEvent(new Event("sft_purchases_updated"));`);
  for (const r of results) {
    storageLines.push(
      `window.dispatchEvent(new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: "${r.slug}" } }));`,
    );
  }
  storageLines.push(`location.href = "/my-learning?tab=certificates";`);

  const browserSnippet = `// Paste in browser console on ${baseUrl} (logged in as ${learnerEmail})\n${storageLines.join("\n")}`;

  console.log("\n--- Ready ---");
  for (const r of results) {
    console.log(`\n${r.purchasedRow.title}`);
    console.log("  Slug:", r.slug);
    console.log("  Certificate ID:", r.cert.id);
    console.log("  Certificate #:", r.cert.certificateNumber);
    console.log("  Score:", r.scorePercent + "%");
    console.log(`  ${baseUrl}/my-learning/certificates/${r.cert.id}`);
  }

  console.log("\nOpen in browser:");
  console.log(`  ${baseUrl}/my-learning?tab=certificates`);
  console.log(`  ${baseUrl}/my-learning?tab=community`);
  console.log(`  ${baseUrl}/my-learning?tab=achievements`);
  console.log("\n--- Browser setup (paste in DevTools console) ---\n");
  console.log(browserSnippet);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
