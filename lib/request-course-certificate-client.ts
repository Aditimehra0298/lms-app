import { readJsonResponse } from "@/lib/safe-json";

/** Call LMS API to start n8n certificate generation after course completion. */
export async function requestCourseCertificateClient(input: {
  learnerEmail: string;
  courseSlug: string;
  scorePercent?: number;
  learnerName?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/certificates/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
  return { ok: Boolean(data.ok), message: data.message };
}
