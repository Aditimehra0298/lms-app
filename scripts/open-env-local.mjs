import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, ".env.local");

if (!existsSync(dest)) {
  console.log("No .env.local yet. Run:  npm run env:init");
  process.exit(1);
}

const quoted = `"${dest}"`;
if (process.platform === "win32") {
  execSync(`notepad ${quoted}`, { stdio: "inherit" });
} else if (process.platform === "darwin") {
  execSync(`open -e ${quoted}`, { stdio: "inherit" });
} else {
  execSync(`${process.env.EDITOR ?? "nano"} ${quoted}`, { stdio: "inherit" });
}
