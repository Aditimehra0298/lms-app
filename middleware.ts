import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Block direct public access to legacy upload folder (use /api/media/serve with token). */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/uploads/admin/")) {
    return NextResponse.json(
      { error: "Direct media access is disabled. Use authorized course playback." },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/uploads/admin/:path*"],
};
