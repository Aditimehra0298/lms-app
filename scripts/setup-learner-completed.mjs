/**
 * Enroll learner, issue ready certificates + demo PDFs, for multiple courses.
 * Usage: node --env-file=.env.local scripts/setup-learner-completed.mjs [email] [slug1,slug2,...]
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const email = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();
const slugs = (
  process.argv[3] ||
  "cybersecurity,food-safety-masterclass,cousers-esg-esg-management-development-training-program"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const root = path.dirname(fileURLToPath(import.meta.url));
const demoScript = path.join(root, "demo-complete-course.mjs");
const baseUrl = "http://localhost:3000";

console.log(`Setting up ${slugs.length} completed course(s) for ${email}`);
console.log(`LMS: ${baseUrl}\n`);

for (const slug of slugs) {
  console.log(`\n=== ${slug} ===`);
  try {
    execSync(`node --env-file=.env.local "${demoScript}" "${slug}" "${email}"`, {
      cwd: path.join(root, ".."),
      env: { ...process.env, NEXT_PUBLIC_APP_URL: baseUrl },
      stdio: "inherit",
    });
  } catch {
    console.error(`Failed for ${slug}`);
  }
}

console.log("\n--- Done ---");
console.log("Open in browser:");
console.log(`  ${baseUrl}/demo/dashboard-setup?email=${encodeURIComponent(email)}`);
console.log(`  ${baseUrl}/my-learning?tab=certificates`);
