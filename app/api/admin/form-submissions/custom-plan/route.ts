import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import {
  CUSTOM_PLAN_STAGES,
  customPlanProposalUrl,
  getCustomPlanRequest,
  sendCustomPlanProposal,
  setCustomPlanStage,
  type CustomPlanStage,
} from "@/lib/server/org-custom-proposal";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

type Body = {
  id?: string;
  action?: "stage" | "proposal";
  stage?: string;
  orgEmail?: string;
  title?: string;
  seats?: number;
  durationMonths?: number;
  amountInr?: number;
  message?: string;
  validDays?: number;
};

/** GET ?id= — workflow state (stage, proposal, payment link) for one Custom Plan request. */
export async function GET(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  const found = id ? await getCustomPlanRequest(id) : null;
  if (!found) return NextResponse.json({ ok: false, message: "Request not found." }, { status: 404 });
  const { proposal } = found;
  return NextResponse.json(
    {
      ok: true,
      stage: found.stage,
      proposal: proposal ? { ...proposal, token: undefined, url: customPlanProposalUrl(found.id, proposal.token) } : null,
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const id = body.id?.trim();
  if (!id || !(await getCustomPlanRequest(id))) {
    return NextResponse.json({ ok: false, message: "Request not found." }, { status: 404 });
  }

  try {
    if (body.action === "stage") {
      if (!CUSTOM_PLAN_STAGES.includes(body.stage as CustomPlanStage)) {
        return NextResponse.json({ ok: false, message: "Invalid stage." }, { status: 400 });
      }
      await setCustomPlanStage(id, body.stage as CustomPlanStage);
      return NextResponse.json({ ok: true }, { headers: noStore });
    }

    if (body.action === "proposal") {
      const result = await sendCustomPlanProposal(id, {
        orgEmail: body.orgEmail ?? "",
        title: body.title ?? "",
        seats: Number(body.seats),
        durationMonths: Number(body.durationMonths),
        amountInr: Number(body.amountInr),
        message: body.message ?? "",
        validDays: Number(body.validDays),
      });
      if (!result.ok) return NextResponse.json(result, { status: 400 });
      return NextResponse.json({ ok: true, url: result.url }, { headers: noStore });
    }

    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("[admin/form-submissions/custom-plan]", err);
    return NextResponse.json({ ok: false, message: "Update failed." }, { status: 500 });
  }
}
