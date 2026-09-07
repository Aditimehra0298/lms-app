/**
 * Shared JSON error helper for API routes — always returns both `message` and `error`.
 */
import { NextResponse } from "next/server";

export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { ok: false, message, error: message, ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function apiOk<T extends Record<string, unknown>>(
  data: T,
  status = 200,
): NextResponse {
  return NextResponse.json(
    { ok: true, ...data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
