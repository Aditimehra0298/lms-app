import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import {
  clearAdminNotifications,
  listAdminNotifications,
  markAdminNotificationsRead,
  pushAdminNotification,
  scanAdminSystemHealth,
} from "@/lib/server/admin-system-notifications";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const scan = url.searchParams.get("scan") === "1";

  let scanResult: Awaited<ReturnType<typeof scanAdminSystemHealth>> | null = null;
  if (scan) {
    try {
      scanResult = await scanAdminSystemHealth();
    } catch (err) {
      console.error("[admin/notifications] scan failed", err);
      await pushAdminNotification({
        dedupeKey: "health:scan-failed",
        title: "Could not finish health check",
        detail: "The panel tried to check for server issues but the scan itself failed. Try again shortly.",
        severity: "warning",
        source: "system",
      });
    }
  }

  const items = await listAdminNotifications();
  const unread = items.filter((n) => !n.readAt).length;

  return NextResponse.json(
    {
      ok: true,
      unread,
      items,
      scan: scanResult,
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const denied = assertMainAdmin(request);
  if (denied) return denied;

  let body: {
    action?: string;
    ids?: string[];
    title?: string;
    detail?: string;
    severity?: "critical" | "warning" | "info";
    source?: string;
    dedupeKey?: string;
    panelHint?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  if (body.action === "mark-read") {
    const count = await markAdminNotificationsRead(body.ids);
    const items = await listAdminNotifications();
    return NextResponse.json(
      { ok: true, marked: count, unread: items.filter((n) => !n.readAt).length, items },
      { headers: noStore },
    );
  }

  if (body.action === "clear-read") {
    const count = await clearAdminNotifications({ readOnly: true });
    const items = await listAdminNotifications();
    return NextResponse.json(
      { ok: true, cleared: count, unread: items.filter((n) => !n.readAt).length, items },
      { headers: noStore },
    );
  }

  if (body.action === "clear-all") {
    const count = await clearAdminNotifications();
    return NextResponse.json({ ok: true, cleared: count, unread: 0, items: [] }, { headers: noStore });
  }

  if (body.action === "scan") {
    const scan = await scanAdminSystemHealth();
    const items = await listAdminNotifications();
    return NextResponse.json(
      {
        ok: true,
        scan,
        unread: items.filter((n) => !n.readAt).length,
        items,
      },
      { headers: noStore },
    );
  }

  if (body.action === "report") {
    const title = body.title?.trim();
    const detail = body.detail?.trim();
    if (!title || !detail) {
      return NextResponse.json({ ok: false, message: "Title and detail are required." }, { status: 400 });
    }
    const item = await pushAdminNotification({
      dedupeKey: body.dedupeKey?.trim() || `manual:${title.slice(0, 40)}`,
      title,
      detail,
      severity: body.severity ?? "warning",
      source: body.source ?? "manual",
      panelHint: body.panelHint,
    });
    const items = await listAdminNotifications();
    return NextResponse.json(
      { ok: true, item, unread: items.filter((n) => !n.readAt).length, items },
      { headers: noStore },
    );
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
