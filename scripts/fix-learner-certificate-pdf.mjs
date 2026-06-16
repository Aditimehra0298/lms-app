/**
 * Fix a learner certificate: visible + on-disk PDF (uses admin template).
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-learner-certificate-pdf.mjs [certId] [email]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const certId = (process.argv[2] || "cmqetynt00003tdacficwmjow").trim();
const email = (process.argv[3] || "aditimehra0298@gmail.com").trim().toLowerCase();

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const tsScript = path.join(scriptDir, "regenerate-certificate-pdf.ts");

const result = spawnSync(
  "npx",
  ["tsx", tsScript, certId, email],
  { stdio: "inherit", shell: true, cwd: path.join(scriptDir, "..") },
);

process.exit(result.status ?? 1);
