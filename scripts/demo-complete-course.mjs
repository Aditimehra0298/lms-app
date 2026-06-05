/**
 * Demo: enroll a learner, issue a ready certificate with PDF, mark course complete in browser storage.
 *
 * Usage: node --env-file=.env.local scripts/demo-complete-course.mjs [courseSlug] [learnerEmail]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const courseSlug = (process.argv[2] || "cybersecurity").trim();
const learnerEmail = (process.argv[3] || process.env.MAIN_ADMIN_EMAIL || "social.sftrainings@gmail.com")
  .trim()
  .toLowerCase();

const CERT_DIR = path.join(process.cwd(), "storage", "private", "certificates");

/** Minimal valid PDF for demo / fallback certificate downloads. */
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

async function getCourseMeta() {
  const res = await fetch(`${baseUrl}/api/courses/${encodeURIComponent(courseSlug)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Course ${courseSlug} not found (${res.status})`);
  return res.json();
}

async function main() {
  console.log("Demo course completion");
  console.log("  Course:", courseSlug);
  console.log("  Learner:", learnerEmail);
  console.log("  LMS:", baseUrl);

  const course = await getCourseMeta();
  const moduleCount = Array.isArray(course.curriculum) ? course.curriculum.length : 3;
  const courseTitle = course.title || courseSlug;

  const bypass = await postJson(
    `${baseUrl}/api/admin/courses/${encodeURIComponent(courseSlug)}/students/actions`,
    { learnerEmail, action: "bypass-access" },
  );
  console.log("Enroll:", bypass.status, bypass.data.message || bypass.data);

  const manual = await postJson(
    `${baseUrl}/api/admin/courses/${encodeURIComponent(courseSlug)}/students/actions`,
    { learnerEmail, action: "manual-certificate-pass" },
  );
  console.log("Certificate:", manual.status, manual.data.message || manual.data);

  const cert = await prisma.lmsCertificate.findFirst({
    where: { learnerEmail, courseSlug },
    orderBy: { issuedAt: "desc" },
  });
  if (!cert) {
    throw new Error("Certificate row was not created. Check MySQL / db:push.");
  }

  await mkdir(CERT_DIR, { recursive: true });
  const pdfPath = path.join(CERT_DIR, `${cert.id}.pdf`);
  await writeFile(pdfPath, DEMO_PDF);

  const pdfUrl = `/api/certificates/${encodeURIComponent(cert.id)}/pdf`;
  await prisma.lmsCertificate.update({
    where: { id: cert.id },
    data: {
      status: "ready",
      visibleToLearner: true,
      pdfUrl,
      scorePercent: 92,
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
    slug: courseSlug,
    title: courseTitle,
    modules: moduleCount,
    duration: course.duration || "2h 00m",
    completed: moduleCount,
    status: "Completed",
    action: "View Certificate",
    tone: "emerald",
    deliveryKind: "managed",
    image: "",
  };

  const browserSnippet = `
// Paste in browser console on ${baseUrl} (while logged in as ${learnerEmail})
localStorage.setItem("sft_logged_in", "true");
localStorage.setItem("sft_learner_email", "${learnerEmail}");
localStorage.setItem("sft_purchased_courses", ${JSON.stringify(JSON.stringify([purchasedRow]))});
localStorage.setItem("sft_completed_modules_${courseSlug}", ${JSON.stringify(JSON.stringify(Array.from({ length: moduleCount }, (_, i) => i + 1)))});
localStorage.setItem("sft_module_exam_scores_${courseSlug}", ${JSON.stringify(JSON.stringify(examScores))});
localStorage.setItem("sft_cert_requested_${courseSlug}", "1");
window.dispatchEvent(new Event("sft_auth_updated"));
window.dispatchEvent(new Event("sft_purchases_updated"));
window.dispatchEvent(new CustomEvent("sft-exam-scores-updated", { detail: { courseSlug: "${courseSlug}" } }));
location.href = "/my-learning?tab=certificates";
`.trim();

  console.log("\n--- Ready ---");
  console.log("Certificate ID:", cert.id);
  console.log("Certificate #:", cert.certificateNumber);
  console.log("\nOpen in browser:");
  console.log(`  ${baseUrl}/my-learning?tab=certificates`);
  console.log(`  ${baseUrl}/my-learning/certificates/${cert.id}`);
  console.log(`\nPDF download (when signed in as ${learnerEmail}):`);
  console.log(`  ${baseUrl}${pdfUrl}?email=${encodeURIComponent(learnerEmail)}`);
  console.log("\n--- Browser setup (paste in DevTools console) ---\n");
  console.log(browserSnippet);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
