/**
 * Test purchase confirmation webhooks (tutor-led or self-paced).
 * Usage:
 *   node --env-file=.env.local scripts/test-n8n-purchase-confirmation.mjs
 *   node --env-file=.env.local scripts/test-n8n-purchase-confirmation.mjs tutor-led
 *   node --env-file=.env.local scripts/test-n8n-purchase-confirmation.mjs self-paced
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

const kind = (process.argv[2] || "tutor-led").toLowerCase();
const appUrl = (readEnv("NEXT_PUBLIC_APP_URL") || readEnv("APP_URL") || "https://www.sftrainings.org").replace(
  /\/$/,
  "",
);
const appName = readEnv("MAIL_APP_NAME") || "Sustainable Futures Trainings";

const defaults = {
  "tutor-led": {
    env: "N8N_TUTOR_LED_PURCHASE_WEBHOOK_URL",
    fallback:
      "https://damnart-ai-guladab.n8n-wsk.com/webhook/purchased(tutor%20led)",
    payload: {
      email: "learner@example.com",
      learnerName: "Jane Doe",
      courseName: "Environmental Management Professional Course",
      deliveryKind: "tutor-led",
      event: "course.purchased",
      source: "LMS",
      emailContent: {
        subject: "Congratulations! Your Tutor-Led Course Is Confirmed",
        previewText:
          "Your tutor-led course is confirmed. View your schedule and join live sessions from your dashboard.",
      },
      links: {
        dashboard: `${appUrl}/dashboard`,
      },
      brand: {
        appName,
        appUrl,
      },
    },
  },
  "self-paced": {
    env: "N8N_SELF_PACED_PURCHASE_WEBHOOK_URL",
    fallback:
      "https://damnart-ai-guladab.n8n-wsk.com/webhook/payment-confirmation(self-based)",
    payload: {
      email: "learner@example.com",
      learnerName: "Jane Doe",
      courseName: "Environmental Management Professional Course",
      deliveryKind: "self-paced",
      event: "course.purchased",
      source: "LMS",
      emailContent: {
        subject: "Congratulations! Your Course Is Confirmed",
        previewText:
          "Your self-paced e-learning course is now available through your dashboard.",
      },
      links: {
        myLearning: `${appUrl}/my-learning`,
        exploreCourses: `${appUrl}/courses`,
        dashboard: `${appUrl}/dashboard`,
      },
      brand: {
        appName,
        appUrl,
      },
    },
  },
};

const config = defaults[kind];
if (!config) {
  console.error("Usage: node scripts/test-n8n-purchase-confirmation.mjs [tutor-led|self-paced]");
  process.exit(1);
}

const url = readEnv(config.env) || config.fallback;
console.log(`POST ${url} (${kind})`);
const res = await fetch(url, {
  method: "POST",
  headers: buildHeaders(),
  body: JSON.stringify(config.payload),
});
const body = await res.text();
console.log("Status:", res.status);
console.log("Body:", body.slice(0, 400));
if (!res.ok) {
  console.error("\nFix: open n8n → Webhook node → Authentication and match .env.local credentials.");
  process.exit(1);
}
