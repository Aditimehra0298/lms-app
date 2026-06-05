/**
 * Test abandoned-cart webhook (same payload as LMS).
 * Usage: node --env-file=.env.local scripts/test-n8n-abandoned-cart.mjs
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

const url =
  process.env.N8N_ABANDONED_CART_WEBHOOK_URL?.trim() ||
  "https://damnart-ai-guladab.n8n-wsk.com/webhook/abandoned-cart";

const user = process.env.N8N_WEBHOOK_USER?.trim() ?? "";
const password = process.env.N8N_WEBHOOK_PASSWORD ?? "";

const headers = { "Content-Type": "application/json" };
if (user && password) {
  headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

const payload = {
  event: "abandoned_cart",
  source: "lms",
  email: "test@example.com",
  learnerName: "Test Learner",
  trigger: "manual",
  abandonedAt: new Date().toISOString(),
  items: [
    {
      slug: "food-safety-diploma",
      title: "Food Safety Diploma",
      price: "$299",
      qty: 1,
      image: null,
      deliveryKind: "managed",
    },
    {
      slug: "haccp-level-3",
      title: "HACCP Level 3 Certification",
      price: "$199",
      qty: 1,
      image: null,
      deliveryKind: "managed",
    },
    {
      slug: "advanced-cyber-security-professional",
      title: "Advanced Cyber Security Professional",
      price: "$499",
      qty: 1,
      image: null,
      deliveryKind: "tutor-led",
    },
    {
      slug: "fssc-22000",
      title: "FSSC 22000 Food Safety",
      price: "$349",
      qty: 1,
      image: null,
      deliveryKind: "managed",
    },
  ],
  cartSummary: {
    itemCount: 4,
    subtotal: "1346.00",
    discount: "134.60",
    total: "1211.40",
    currency: "USD",
  },
  emailContent: {
    subject: "Complete your SF Trainings order — 4 items in your cart",
    previewText: "Test Learner, you left 4 courses in your cart.",
  },
  brand: {
    appName: "SF Trainings",
    shortBrand: "SFT",
    appUrl: "http://localhost:3000",
    logoUrl: null,
  },
  links: {
    cart: "http://localhost:3000/cart",
    checkout: "http://localhost:3000/checkout",
    courses: "http://localhost:3000/courses",
  },
};

console.log("POST", url);
const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
const body = await res.text();
console.log("Status:", res.status);
console.log("Body:", body.slice(0, 400));
if (!res.ok) process.exit(1);
