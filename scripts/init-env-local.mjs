import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = join(root, "env.local.template");
const dest = join(root, ".env.local");

if (existsSync(dest)) {
  console.log(".env.local already exists — not overwritten. Edit it directly or delete it and run again.");
  process.exit(0);
}

copyFileSync(template, dest);
console.log("Created .env.local from env.local.template");
console.log("Next: fill in DATABASE_URL and Zoom values, then restart the dev server.");
