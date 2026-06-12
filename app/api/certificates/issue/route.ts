import { NextResponse } from "next/server";
import {
  issueCourseCertificate,
  issueEmployeeCourseCertificate,
} from "@/lib/server/certificate-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    learnerEmail?: string;
    employeeEmail?: string;
    organizationWorkEmail?: string;
    learnerName?: string;
    employeeName?: string;
    courseSlug?: string;
    scorePercent?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const employeeEmail = body.employeeEmail?.trim();
    const result = employeeEmail
      ? await issueEmployeeCourseCertificate({
          employeeEmail,
          employeeName: body.employeeName ?? body.learnerName,
          organizationWorkEmail: body.organizationWorkEmail,
          courseSlug: body.courseSlug ?? "",
          scorePercent: body.scorePercent,
        })
      : await issueCourseCertificate({
          learnerEmail: body.learnerEmail ?? "",
          learnerName: body.learnerName,
          courseSlug: body.courseSlug ?? "",
          scorePercent: body.scorePercent,
        });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/issue]", err);
    return NextResponse.json(
      { ok: false, message: "Certificate issue failed. Ensure MySQL is running and run: npm run db:push" },
      { status: 503 },
    );
  }
}
