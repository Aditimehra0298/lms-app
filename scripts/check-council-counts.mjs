import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const counts = {
  institutes: await p.sftInstitute.count(),
  courses: await p.sftInstituteCourse.count(),
  students: await p.sftInstituteStudent.count(),
  videos: await p.sftTrainingVideo.count(),
  certs: await p.sftInstituteCertificate.count(),
  forms: await p.sftVerifyUnlockForm.count(),
  lmsUsers: await p.lmsUser.count(),
  lmsCourses: await p.lmsCourse.count(),
  lmsCerts: await p.lmsCertificate.count(),
  lmsOrgs: await p.lmsOrganization.count(),
  formSubs: await p.lmsFormSubmission.count(),
};
console.log(JSON.stringify(counts, null, 2));
await p.$disconnect();
