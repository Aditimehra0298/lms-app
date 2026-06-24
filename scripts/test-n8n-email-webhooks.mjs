/**
 * Smoke-test all five SFT transactional email webhooks.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-n8n-email-webhooks.mjs [type]
 *
 * Types: tutor-led | self-paced | meeting-reminder | course-completion | reviews | all
 */
import { readFileSync } from "node:fs";

function readEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function basicAuthHeader() {
  const user = readEnv("N8N_WEBHOOK_USER") || readEnv("N8N_USER");
  const pass = readEnv("N8N_WEBHOOK_PASSWORD") || readEnv("N8N_PASS");
  if (!user || !pass) return {};
  const encoded = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

const base =
  readEnv("N8N_WEBHOOK_BASE_URL") || "https://damnart-ai-guladab.n8n-wsk.com/webhook/";
const baseUrl = base.endsWith("/") ? base : `${base}/`;
const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "https://www.sftrainings.org";

function webhookUrl(pathSegment) {
  const explicit = {
    "tutor-led": readEnv("N8N_TUTOR_LED_PURCHASE_WEBHOOK_URL"),
    "self-paced": readEnv("N8N_SELF_PACED_PURCHASE_WEBHOOK_URL"),
    "meeting-reminder": readEnv("N8N_MEETING_REMINDER_WEBHOOK_URL"),
    "course-completion": readEnv("N8N_COURSE_COMPLETION_WEBHOOK_URL"),
    reviews: readEnv("N8N_REVIEWS_WEBHOOK_URL"),
  }[pathSegment];
  if (explicit) return explicit;
  const paths = {
    "tutor-led": "purchased(tutor led)",
    "self-paced": "payment-confirmation(self-based)",
    "meeting-reminder": "meeting-reminder",
    "course-completion": "course-completion",
    reviews: "reviews",
  };
  return `${baseUrl}${encodeURIComponent(paths[pathSegment] ?? pathSegment)}`;
}

const sample = {
  email: readEnv("TEST_LEARNER_EMAIL") || "aditimehra0298@gmail.com",
  learnerName: "Aditi Mehra",
  courseName: "Environmental Management Professional Course",
};

const brand = {
  appName: "Sustainable Futures Trainings",
  appUrl: appUrl.replace(/\/$/, ""),
};

const payloads = {
  "tutor-led": {
    ...sample,
    deliveryKind: "tutor-led",
    event: "course.purchased",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! Your Tutor-Led Course Is Confirmed",
      previewText: "Your tutor-led course is confirmed.",
    },
    links: { dashboard: `${brand.appUrl}/dashboard` },
    brand,
  },
  "self-paced": {
    ...sample,
    deliveryKind: "self-paced",
    event: "course.purchased",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! Your Course Is Confirmed",
      previewText: "Your self-paced course is now available.",
    },
    links: {
      myLearning: `${brand.appUrl}/my-learning`,
      exploreCourses: `${brand.appUrl}/courses`,
      dashboard: `${brand.appUrl}/dashboard`,
    },
    brand,
  },
  "meeting-reminder": {
    ...sample,
    instructorName: "Dr. Sarah Johnson",
    sessionDate: "Monday, June 23, 2026",
    sessionTime: "2:30 PM",
    timezone: "IST",
    meetingPlatform: "Zoom",
    joinLink: "https://zoom.us/j/1234567890",
    deliveryKind: "tutor-led",
    event: "session.reminder",
    source: "LMS",
    brand,
  },
  "course-completion": {
    ...sample,
    event: "course.completed",
    source: "LMS",
    deliveryKind: "self-paced",
    links: {
      dashboard: `${brand.appUrl}/dashboard`,
      certificate: `${brand.appUrl}/my-learning?tab=certificates`,
    },
    brand,
  },
  reviews: {
    ...sample,
    event: "course.feedback.requested",
    source: "LMS",
    deliveryKind: "self-paced",
    links: {
      review: `${brand.appUrl}/my-learning/course/test-course#reviews`,
      dashboard: `${brand.appUrl}/dashboard`,
    },
    brand,
  },
};

async function post(type) {
  const url = webhookUrl(type);
  const body = payloads[type];
  console.log(`\n→ POST ${type}\n  ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...basicAuthHeader() },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`  ${res.status} ${text.slice(0, 200) || "(empty)"}`);
  return res.ok;
}

const arg = (process.argv[2] || "all").toLowerCase();
const types =
  arg === "all"
    ? ["tutor-led", "self-paced", "meeting-reminder", "course-completion", "reviews"]
    : [arg];

let failed = 0;
for (const type of types) {
  if (!payloads[type]) {
    console.error(`Unknown type: ${type}`);
    process.exitCode = 1;
    break;
  }
  const ok = await post(type);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} webhook(s) failed. Check N8N_WEBHOOK_USER/PASSWORD and active workflows.`);
  process.exitCode = 1;
} else {
  console.log("\nAll requested webhooks returned 2xx.");
}
