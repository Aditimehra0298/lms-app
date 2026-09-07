import { readJsonResponse } from "@/lib/safe-json";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { pushLearnerCourseProgressToServerNow } from "@/lib/learner-progress-sync-client";

/** Create certificate row (if needed) and start n8n with course template assets. */
export async function requestCourseCertificateClient(input: {
  learnerEmail: string;
  courseSlug: string;
  scorePercent?: number;
  learnerName?: string;
  forceRetry?: boolean;
}): Promise<{
  ok: boolean;
  message?: string;
  certificate?: CertificateRowDto;
  certificateId?: string;
}> {
  // Ensure server has latest exam/module progress before eligibility check.
  await pushLearnerCourseProgressToServerNow(input.courseSlug);

  const res = await fetch("/api/certificates/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      courseSlug: input.courseSlug,
      learnerName: input.learnerName,
      forceRetry: input.forceRetry,
      // learnerEmail / scorePercent ignored by server — session + progress used instead.
    }),
  });
  const data = await readJsonResponse(res, {} as {
    ok?: boolean;
    message?: string;
    certificate?: CertificateRowDto;
  });
  return {
    ok: Boolean(data.ok),
    message: data.message,
    certificate: data.certificate,
    certificateId: data.certificate?.id,
  };
}
