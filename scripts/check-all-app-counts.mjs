import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const p = new PrismaClient();
const progressPath = path.join(process.cwd(), "data", "learner-course-progress.json");
let progressLearners = 0;
if (existsSync(progressPath)) {
  try {
    const raw = JSON.parse(readFileSync(progressPath, "utf8"));
    progressLearners = Object.keys(raw.learners || {}).length;
  } catch {
    /* ignore */
  }
}
const counts = {
  users: await p.lmsUser.count(),
  orgs: await p.lmsOrganization.count(),
  courses: await p.lmsCourse.count(),
  courseContent: await p.lmsCourseContent.count(),
  media: await p.lmsMediaAsset.count(),
  purchases: await p.lmsPurchase.count(),
  payments: await p.lmsPayment.count(),
  certificates: await p.lmsCertificate.count(),
  issues: await p.lmsIssue.count(),
  chat: await p.lmsChatHistory.count(),
  forms: await p.lmsFormSubmission.count(),
  progressLearners,
};
console.log(JSON.stringify(counts, null, 2));
await p.$disconnect();
