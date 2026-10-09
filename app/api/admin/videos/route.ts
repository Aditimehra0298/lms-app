import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { listAdminVideoFiles } from "@/lib/server/admin-video-library";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const videos = await listAdminVideoFiles();

  if (new URL(request.url).searchParams.get("format") === "csv") {
    const lines = [
      "fileName,downloadName,course,sizeMB,uploadedAt",
      ...videos.map((v) =>
        [
          csvCell(v.fileName),
          csvCell(v.downloadName),
          csvCell(v.courseSlug),
          (v.sizeBytes / 1048576).toFixed(1),
          csvCell(v.uploadedAt),
        ].join(","),
      ),
    ];
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="video-list.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      videos,
      totalBytes: videos.reduce((sum, v) => sum + v.sizeBytes, 0),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
