/**
 * Test abandoned-cart webhook (GET — same as LMS for all account types).
 * Usage:
 *   node scripts/test-n8n-abandoned-cart.mjs
 *   node scripts/test-n8n-abandoned-cart.mjs --org
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

const headers = {};
if (user && password) {
  headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

const isOrg = process.argv.includes("--org");

const payload = {
  event: "abandoned_cart",
  source: "lms",
  accountType: isOrg ? "organisation" : "individual",
  email: isOrg ? "org.admin@company.com" : "test@example.com",
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
  ],
  cartSummary: {
    itemCount: 2,
    subtotal: "498.00",
    discount: "0.00",
    total: "498.00",
    currency: "USD",
  },
  emailContent: {
    subject: "Complete your SF Trainings order — items in your cart",
    previewText: "Test Learner, you left courses in your cart.",
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

const params = new URLSearchParams();
for (const [key, value] of Object.entries(payload)) {
  params.set(key, typeof value === "string" ? value : JSON.stringify(value));
}
const requestUrl = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;

console.log("GET", requestUrl.slice(0, 120) + (requestUrl.length > 120 ? "…" : ""));
console.log("accountType:", payload.accountType);
const res = await fetch(requestUrl, { method: "GET", headers });
const body = await res.text();
console.log("Status:", res.status);
console.log("Body:", body.slice(0, 400));
if (!res.ok) process.exit(1);
