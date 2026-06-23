/**
 * Generate real n8n certificates via LMS download API (archives PDF on disk + DB).
 * Usage:
 *   node --env-file=.env.local scripts/seed-n8n-certificates-for-learner.mjs aditimehra0298@gmail.com slug1,slug2
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import { stat } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();
const slugs = (process.argv[3] || "cyber-security-phishing-awareness-training,food-safety-masterclass")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const pdfDir = path.join(process.cwd(), "storage", "private", "certificates");

const prisma = new PrismaClient();

async function requestCert(slug) {
  const res = await fetch(`${baseUrl}/api/certificates/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      learnerEmail: email,
      courseSlug: slug,
      scorePercent: 100,
      forceRetry: false,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || `request failed for ${slug} (${res.status})`);
  }
  return data.certificate;
}

async function generateViaN8n(certificateId, forceRegenerate) {
  const res = await fetch(`${baseUrl}/api/certificates/${encodeURIComponent(certificateId)}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, attachment: false, forceRegenerate }),
  });
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("pdf")) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, bytes: buf.length, cached: res.headers.get("x-certificate-cached") === "1" };
  }
  const err = await res.json();
  return { ok: false, message: err.message || `HTTP ${res.status}` };
}

async function pdfBytes(id) {
  try {
    const s = await stat(path.join(pdfDir, `${id}.pdf`));
    return s.size;
  } catch {
    return 0;
  }
}

try {
  console.log("n8n certificate seed");
  console.log("  Learner:", email);
  console.log("  LMS:", baseUrl);
  console.log("  Courses:", slugs.join(", "));
  console.log("");

  for (const slug of slugs) {
    console.log(`--- ${slug} ---`);
    let cert = await prisma.lmsCertificate.findFirst({
      where: { learnerEmail: email, courseSlug: slug },
      orderBy: { issuedAt: "desc" },
    });

    if (!cert) {
      console.log("Creating certificate record + first n8n POST…");
      const created = await requestCert(slug);
      cert = await prisma.lmsCertificate.findUnique({ where: { id: created.id } });
    }

    if (!cert) throw new Error("No certificate row");

    try {
      await unlink(path.join(pdfDir, `${cert.id}.pdf`));
    } catch {
      /* no file */
    }
    await prisma.lmsCertificate.update({
      where: { id: cert.id },
      data: { pdfUrl: null, status: "pending", issuedVia: "n8n" },
    });

    console.log("Certificate ID:", cert.id);
    console.log("Calling n8n via LMS download (may take ~15s)…");

    const result = await generateViaN8n(cert.id, true);
    const size = await pdfBytes(cert.id);
    const updated = await prisma.lmsCertificate.findUnique({ where: { id: cert.id } });

    if (result.ok && size > 4000) {
      console.log(`OK — PDF archived (${size} bytes), cached=${result.cached}`);
      console.log(`  courseName → n8n template for ${slug}`);
      console.log(`  pdfUrl: ${updated?.pdfUrl}`);
      console.log(`  view: ${baseUrl}/my-learning/certificates/${cert.id}`);
    } else {
      console.log("Result:", result);
      console.log(`PDF on disk: ${size} bytes`);
      console.log(`DB status: ${updated?.status}, pdfUrl: ${updated?.pdfUrl}`);
    }
    console.log("");
  }

  console.log("Open certificates tab:");
  console.log(`  ${baseUrl}/my-learning?tab=certificates`);
} finally {
  await prisma.$disconnect();
}
