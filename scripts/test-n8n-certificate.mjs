/** Quick test: POST full certificate payload shape to N8N_CERTIFICATE_WEBHOOK_URL. */
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

const callbackUrl = `${appBase}/api/certificates/n8n-callback`;
const verifyUrl = `${appBase}/certificates/verify?delegate=2026-0008-106`;
const issueDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const body = {
  source: "lms",
  event: "course_completed",
  certificateId: "test-lms-ping",
  callbackUrl,
  email: "aditimehra0298@gmail.com",
  learnerName: "Aditi Sharma",
  courseSlug: "cyber-security-phishing-awareness-training",
  courseTitle: "Cyber Security Phishing Awareness Trainings",
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
    candidateName: "Aditi Sharma",
    courseName: "Cyber Security Phishing Awareness Trainings",
    courseDescription: "Phishing awareness training",
    duration: "2h 00m",
    mode: "E-Learning, Self-paced",
    issueDate,
    certificateNumber: "2026-06-113-001/106",
    delegateNumber: "2026-0008-106",
    verifyUrl,
  },
  transcriptFields: {
    candidateName: "Aditi Sharma",
    trainingProgram: "Cyber Security Phishing Awareness Trainings",
    grade: "100%",
    certificateNumber: "2026-06-113-001/106",
    issueDate,
    delegateNumber: "2026-0008-106",
  },
  tracker: {
    delegateNumber: "2026-0008-106",
    verifyNumber: 8,
    verifyUrl,
    qrCodeData: verifyUrl,
  },
  // Flat aliases (same as production LMS payload)
  candidateName: "Aditi Sharma",
  courseName: "Cyber Security Phishing Awareness Trainings",
  certificateNumber: "2026-06-113-001/106",
  delegateNumber: "2026-0008-106",
  verifyUrl,
  grade: "100%",
  issueDate,
  duration: "2h 00m",
  mode: "E-Learning, Self-paced",
  trainingProgram: "Cyber Security Phishing Awareness Trainings",
  certificateTemplate: `${appBase}/api/media/serve/example-template.png`,
  badge: `${appBase}/api/media/serve/example-badge.png`,
  transcriptTemplate: `${appBase}/api/media/serve/example-transcript.png`,
};

console.log("POST", url);
console.log("Flat fields sample:", {
  callbackUrl: body.callbackUrl,
  candidateName: body.candidateName,
  courseName: body.courseName,
  certificateNumber: body.certificateNumber,
  delegateNumber: body.delegateNumber,
  verifyUrl: body.verifyUrl,
  grade: body.grade,
});

const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
const text = await res.text();
console.log("status:", res.status);
console.log("body:", text.slice(0, 500));
