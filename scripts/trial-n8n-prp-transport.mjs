/** Trial certificate POST for prp-transport-storage-iso-ts-22002-5 */
function readEnv(name) {
  let v = process.env[name]?.trim() ?? "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const url = readEnv("N8N_CERTIFICATE_WEBHOOK_URL");
const user = readEnv("N8N_WEBHOOK_USER");
const password = readEnv("N8N_WEBHOOK_PASSWORD");
const appBase = (readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000").replace(/\/$/, "");

if (!url) {
  console.error("N8N_CERTIFICATE_WEBHOOK_URL not set");
  process.exit(1);
}

const headers = { "Content-Type": "application/json" };
if (user && password) {
  headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

const learnerName = "Aditi";
const courseName = "PRP Requirements for Transport and Storage as per ISOTS 22002-52019";
const courseSlug = "prp-transport-storage-iso-ts-22002-5";
const courseTitle = "PRP Requirements for Transport and Storage as per ISO/TS 22002-5:2019";
const callbackUrl = `${appBase}/api/certificates/n8n-callback`;
const verifyUrl = `${appBase}/certificates/verify?delegate=2026-0009-107`;
const issueDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const body = {
  source: "lms",
  event: "course_completed",
  certificateId: "trial-prp-transport-aditi",
  callbackUrl,
  email: "aditimehra0298@gmail.com",
  learnerName,
  courseSlug,
  courseTitle,
  scorePercent: 100,
  completedAt: new Date().toISOString(),
  assets: {
    certificateTemplate: `${appBase}/api/media/serve/example-template.png`,
    badge: `${appBase}/api/media/serve/example-badge.png`,
    transcriptTemplate: `${appBase}/api/media/serve/example-transcript.png`,
    certificateTemplatePath: "/api/media/serve/example-template.png",
    badgePath: "/api/media/serve/example-badge.png",
    transcriptTemplatePath: "/api/media/serve/example-transcript.png",
  },
  certificateFields: {
    candidateName: learnerName,
    courseName,
    courseDescription: courseTitle,
    duration: "3h 00m",
    mode: "E-Learning, Self-paced",
    issueDate,
    certificateNumber: "2026-06-114-001/107",
    delegateNumber: "2026-0009-107",
    verifyUrl,
  },
  transcriptFields: {
    candidateName: learnerName,
    trainingProgram: courseName,
    grade: "100%",
    certificateNumber: "2026-06-114-001/107",
    issueDate,
    delegateNumber: "2026-0009-107",
  },
  tracker: {
    delegateNumber: "2026-0009-107",
    verifyNumber: 9,
    verifyUrl,
    qrCodeData: verifyUrl,
  },
  candidateName: learnerName,
  courseName,
  certificateNumber: "2026-06-114-001/107",
  delegateNumber: "2026-0009-107",
  verifyUrl,
  grade: "100%",
  issueDate,
  duration: "3h 00m",
  mode: "E-Learning, Self-paced",
  trainingProgram: courseName,
  certificateTemplate: `${appBase}/api/media/serve/example-template.png`,
  badge: `${appBase}/api/media/serve/example-badge.png`,
  transcriptTemplate: `${appBase}/api/media/serve/example-transcript.png`,
};

console.log("POST", url);
console.log("Trial:", { courseSlug, candidateName: learnerName, courseName });

const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
const text = await res.text();
console.log("status:", res.status);
console.log("body:", text.slice(0, 800));
