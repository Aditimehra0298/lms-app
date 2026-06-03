import { NextResponse } from "next/server";
import {
  listFormSubmissions,
  revertFormSubmissionToInbox,
  updateFormSubmissionStatus,
  type FormSubmissionStatus,
  type FormSubmissionView,
} from "@/lib/server/form-submissions-store";
import { isMainAdminEmail } from "@/lib/server/admin-emails";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function adminEmailFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return (
    request.headers.get("x-admin-email")?.trim().toLowerCase() ||
    url.searchParams.get("email")?.trim().toLowerCase() ||
    null
  );
}

function assertAdmin(request: Request): NextResponse | null {
  const email = adminEmailFromRequest(request);
  if (!email || !isMainAdminEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const formType = url.searchParams.get("formType")?.trim() || undefined;
  const status = url.searchParams.get("status")?.trim() || undefined;
  const viewParam = url.searchParams.get("view")?.trim() as FormSubmissionView | undefined;
  const view: FormSubmissionView =
    viewParam && ["active", "done", "archived", "all"].includes(viewParam) ? viewParam : "active";
  const q = url.searchParams.get("q")?.trim() || undefined;

  try {
    const submissions = await listFormSubmissions({ formType, status, view, q });
    return NextResponse.json({ ok: true, submissions }, { headers: noStore });
  } catch (err) {
    console.error("[admin/form-submissions GET]", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load submissions. Run database migration for lms_form_submission." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  let body: { id?: string; status?: FormSubmissionStatus; action?: "revert" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id." }, { status: 400 });
  }

  try {
    if (body.action === "revert") {
      const updated = await revertFormSubmissionToInbox(id);
      return NextResponse.json({ ok: true, submission: updated }, { headers: noStore });
    }

    const status = body.status;
    if (!status || !["new", "read", "done", "archived"].includes(status)) {
      return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
    }

    const updated = await updateFormSubmissionStatus(id, status);
    return NextResponse.json({ ok: true, submission: updated }, { headers: noStore });
  } catch (err) {
    console.error("[admin/form-submissions PATCH]", err);
    return NextResponse.json({ ok: false, message: "Update failed." }, { status: 500 });
  }
}
