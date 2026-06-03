/**
 * Test welcome webhook (same payload as Google / email registration).
 * Usage: node --env-file=.env.local scripts/test-n8n-welcome.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(envPath);

function readEnv(name) {
  let value = process.env[name]?.trim() ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const mode = (readEnv("N8N_WEBHOOK_AUTH_MODE") || "basic").toLowerCase();
  if (mode === "header") {
    const name = readEnv("N8N_WEBHOOK_HEADER_NAME");
    const value = readEnv("N8N_WEBHOOK_HEADER_VALUE");
    if (name && value) headers[name] = value;
  } else if (mode !== "none") {
    const user = readEnv("N8N_WEBHOOK_USER");
    const password = readEnv("N8N_WEBHOOK_PASSWORD");
    if (user && password) {
      headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
    }
  }
  const secret = readEnv("N8N_WEBHOOK_SECRET");
  if (secret) headers["X-Webhook-Secret"] = secret;
  return headers;
}

const url = readEnv("N8N_WELCOME_WEBHOOK_URL");
if (!url) {
  console.error("N8N_WELCOME_WEBHOOK_URL is not set in .env.local");
  process.exit(1);
}

const payload = {
  event: "learner_registered",
  source: "lms",
  email: "test-google@example.com",
  learnerName: "Google Test User",
  signUpMethod: "google",
  accountType: "individual",
};

console.log("POST", url);
const res = await fetch(url, {
  method: "POST",
  headers: buildHeaders(),
  body: JSON.stringify(payload),
});
const body = await res.text();
console.log("Status:", res.status);
console.log("Body:", body.slice(0, 400));
if (!res.ok) {
  console.error("\nFix: open n8n → Webhook node → Authentication and match .env.local credentials.");
  process.exit(1);
}
