"use client";

import { CheckCircle2, Circle, Loader2, XCircle, Zap } from "lucide-react";
import type { CertificateRowDto } from "@/lib/certificate-types";

type StepState = "done" | "active" | "pending" | "error";

type Props = {
  certificate: CertificateRowDto | null;
  /** True after auto-request on course completion (or localStorage flag). */
  certRequested: boolean;
  /** True while polling `/api/certificates` for n8n callback. */
  polling?: boolean;
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (state === "active") return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />;
  if (state === "error") return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
  return <Circle className="h-4 w-4 shrink-0 text-gray-600" />;
}

function StepRow({
  label,
  detail,
  state,
}: {
  label: string;
  detail?: string;
  state: StepState;
}) {
  const textClass =
    state === "done"
      ? "text-emerald-100"
      : state === "active"
        ? "text-violet-100"
        : state === "error"
          ? "text-red-200"
          : "text-gray-500";

  return (
    <li className="flex gap-2.5">
      <StepIcon state={state} />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${textClass}`}>{label}</p>
        {detail ? <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{detail}</p> : null}
      </div>
    </li>
  );
}

/** Step-by-step n8n certificate pipeline — visible on course completion for workflow testing. */
export function N8nCertificateGenerationStatus({
  certificate,
  certRequested,
  polling = false,
}: Props) {
  if (!certRequested && !certificate) return null;

  const issuedVia = certificate?.issuedVia?.toLowerCase() ?? "";
  const usesN8n = !certificate || issuedVia === "n8n" || issuedVia === "api";
  if (!usesN8n) return null;

  const recordCreated = Boolean(certificate?.id);
  const n8nDispatched = recordCreated;
  const pdfReady = Boolean(
    certificate?.pdfReady || certificate?.pdfUrl?.trim().startsWith("/api/certificates/"),
  );
  const failed = certificate?.status === "failed";
  const waitingForN8n =
    recordCreated && !pdfReady && !failed && (certificate?.status === "pending" || polling);

  const step1State: StepState = certRequested || recordCreated ? "done" : "active";
  const step2State: StepState = failed
    ? "error"
    : n8nDispatched
      ? pdfReady
        ? "done"
        : waitingForN8n
          ? "active"
          : "done"
      : certRequested
        ? "active"
        : "pending";
  const step3State: StepState = failed
    ? "error"
    : pdfReady
      ? "done"
      : waitingForN8n
        ? "active"
        : "pending";

  const headline = failed
    ? "n8n certificate generation failed"
    : pdfReady
      ? "n8n certificate ready"
      : waitingForN8n
        ? "n8n is generating your certificate…"
        : certRequested
          ? "n8n certificate workflow started"
          : "Preparing n8n certificate workflow…";

  const headlineClass = failed
    ? "text-red-200"
    : pdfReady
      ? "text-emerald-200"
      : "text-violet-200";

  return (
    <div
      className="rounded-lg border border-violet-400/25 bg-violet-500/8 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${headlineClass}`}>
        <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {headline}
        {waitingForN8n && polling ? (
          <span className="font-normal normal-case text-gray-400">(checking every 8s)</span>
        ) : null}
      </p>

      <ol className="mt-3 space-y-2.5">
        <StepRow
          state={step1State}
          label="Course completed — certificate requested"
          detail={
            certRequested
              ? "LMS sent a certificate request when you finished all modules and exams."
              : undefined
          }
        />
        <StepRow
          state={step2State}
          label="n8n workflow triggered"
          detail={
            recordCreated
              ? `Webhook dispatched (record ${certificate!.id.slice(0, 12)}…, via ${certificate!.issuedVia}).`
              : certRequested
                ? "Waiting for the LMS to create your certificate record…"
                : undefined
          }
        />
        <StepRow
          state={step3State}
          label={failed ? "PDF generation failed" : "PDF saved on LMS"}
          detail={
            failed
              ? "n8n reported a failure or the callback did not include a PDF. Try Regenerate or check the n8n workflow."
              : pdfReady
                ? "Official PDF archived — download is instant from here or Certificate Records."
                : waitingForN8n
                  ? "n8n is building the PDF and will call back to the LMS when ready (~15 seconds)."
                  : recordCreated
                    ? "Click Get certificate PDF to trigger generation if n8n did not run yet."
                    : undefined
          }
        />
      </ol>

      {certificate?.certificateNumber && !certificate.certificateNumber.startsWith("TEMP-") ? (
        <p className="mt-2.5 border-t border-white/10 pt-2 font-mono text-[10px] text-gray-500">
          Certificate no. {certificate.certificateNumber}
        </p>
      ) : null}
    </div>
  );
}
