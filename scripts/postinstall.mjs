/**
 * Runs after `npm install`. Uses Node's system CA store so Prisma can download
 * query engines on networks with SSL inspection (same fix as NODE_OPTIONS=--use-system-ca).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const node = process.execPath;
const caFlag = "--use-system-ca";

function withSystemCaEnv() {
  const env = { ...process.env };
  const cur = (env.NODE_OPTIONS ?? "").trim();
  if (!cur.includes(caFlag)) {
    env.NODE_OPTIONS = cur ? `${cur} ${caFlag}` : caFlag;
  }
  return env;
}

const env = withSystemCaEnv();

const nanoid = spawnSync(node, [caFlag, "scripts/ensure-nanoid-non-secure.mjs"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: false,
});
if (nanoid.status !== 0) process.exit(nanoid.status ?? 1);

const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) {
  console.warn("[postinstall] prisma CLI missing; skip prisma generate.");
  process.exit(0);
}

const prisma = spawnSync(node, [caFlag, prismaCli, "generate"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: false,
});
process.exit(prisma.status ?? 1);
