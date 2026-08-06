/**
 * Smoke-test all five SFT transactional email webhooks.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-n8n-email-webhooks.mjs [type]
 *
 * Types: tutor-led | self-paced | meeting-reminder | course-completed | course-completion | progress-report | module-completed | password-reset | reviews | all
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
    "course-completed": readEnv("N8N_COURSE_COMPLETION_WEBHOOK_URL"),
    "progress-report": readEnv("N8N_PROGRESS_REPORT_WEBHOOK_URL"),
    "module-completed": readEnv("N8N_MODULE_COMPLETED_WEBHOOK_URL"),
    "password-reset": readEnv("N8N_PASSWORD_RESET_WEBHOOK_URL"),
    reviews: readEnv("N8N_REVIEWS_WEBHOOK_URL"),
  }[pathSegment];
  if (explicit) return explicit;
  const paths = {
    "tutor-led": "purchased(tutor led)",
    "self-paced": "payment-confirmation(self-based)",
    "meeting-reminder": "meeting-reminder",
    "course-completion": "course-completed",
    "course-completed": "course-completed",
    "progress-report": "progress-report",
    "module-completed": "module completed",
    "password-reset": "password-reset",
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
  "course-completed": {
    ...sample,
    event: "course.completed",
    source: "LMS",
    deliveryKind: "self-paced",
    emailContent: {
      subject: "Congratulations! You've Successfully Completed the Course",
      previewText:
        "Congratulations! Your course completion certificate is ready. Download it and showcase your achievement with pride.",
    },
    links: {
      certificate: `${brand.appUrl}/api/certificates/test-cert-id/download`,
      browseCourses: "https://www.sftrainings.org/courses",
      support: "mailto:info@sftrainings.org",
      dashboard: `${brand.appUrl}/my-learning`,
    },
    brand: {
      appName: "Sustainable Futures Trainings",
      appUrl: "https://www.sftrainings.org",
    },
  },
  "progress-report": {
    ...sample,
    deliveryKind: "self-paced",
    event: "course.progress",
    source: "LMS",
    emailContent: {
      subject: "Your Course Progress Report",
      previewText:
        "See your latest course progress and keep moving forward toward certification.",
    },
    links: {
      dashboard: `${brand.appUrl}/my-learning`,
    },
    progress: {
      overall: 45,
      completedLessons: 9,
      totalLessons: 20,
      quizzesPassed: 2,
      modules: [
        { name: "Module 1 — Foundations", done: 4, total: 4 },
        { name: "Module 2 — Assessment", done: 3, total: 4 },
        { name: "Module 3 — Practice", done: 2, total: 4 },
        { name: "Module 4 — Advanced", done: 0, total: 4 },
        { name: "Module 5 — Capstone", done: 0, total: 4 },
      ],
    },
    brand,
  },
  "module-completed": {
    ...sample,
    moduleName: "Module 3: Risk Assessment",
    moduleLabel: "3: Risk Assessment",
    status: "Module Completed",
    examResult: "Passed",
    score: 88,
    attemptedOn: "May 8, 2025",
    lessonsCompleted: 4,
    quizzesAttempted: 3,
    certificatePath: "On Track",
    deliveryKind: "self-paced",
    event: "module.completed",
    source: "LMS",
    emailContent: {
      subject: "Congratulations! You Completed the Module and Passed the Exam",
      previewText:
        "Great work! You've completed the module and passed the exam. See your results and what's next.",
    },
    links: {
      nextModule: `${brand.appUrl}/my-learning/course/test-course?module=4`,
      dashboard: `${brand.appUrl}/my-learning`,
    },
    brand,
  },
  "password-reset": {
    ...sample,
    resetToken: "a1b2c3d4e5f678901234567890abcdef0123456789abcdef0123456789abcd",
    resetExpiryHours: 24,
    event: "password.reset",
    source: "LMS",
    deliveryKind: "auth",
    emailContent: {
      subject: "Reset Your Password",
      previewText:
        "We received a request to reset your password. Click the button below to set a new password and regain access to your account.",
    },
    links: {
      reset: `${brand.appUrl}/reset-password?token=a1b2c3d4e5f678901234567890abcdef0123456789abcdef0123456789abcd`,
      support: "mailto:info@sftrainings.org",
    },
    brand: {
      appName: "Sustainable Futures Trainings",
      appUrl: "https://www.sftrainings.org",
    },
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

payloads["course-completion"] = payloads["course-completed"];

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
    ? ["tutor-led", "self-paced", "meeting-reminder", "course-completed", "progress-report", "module-completed", "password-reset", "reviews"]
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
