import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Block direct public access to private media (use /api/media/serve with token). */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/uploads/admin/") || path.startsWith("/storage/private/")) {
    return NextResponse.json(
      { error: "Direct media access is disabled. Use authorized course playback." },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/uploads/admin/:path*", "/storage/private/:path*"],
};
