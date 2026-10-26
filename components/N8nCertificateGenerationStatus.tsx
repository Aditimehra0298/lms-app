"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { CertificateRowDto } from "@/lib/certificate-types";

type StepState = "done" | "active" | "pending" | "error";

type Props = {
  certificate: CertificateRowDto | null;
  /** True after auto-request on course completion (or localStorage flag). */
  certRequested: boolean;
  /** True while waiting for the official PDF to become available. */
  polling?: boolean;
  /** Certificate is published to the learner (ready + visible). */
  approved?: boolean;
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

/**
 * Learner-facing certificate progress — no internal tooling / vendor names.
 */
export function N8nCertificateGenerationStatus({
  certificate,
  certRequested,
  polling = false,
  approved = false,
}: Props) {
  if (!certRequested && !certificate) return null;

  const recordCreated = Boolean(certificate?.id);
  const generated = Boolean(certificate?.pdfReady);
  const pdfReady = generated && approved;
  const awaitingApproval = generated && !approved;
  const failed = certificate?.status === "failed";
  const waiting =
    recordCreated && !generated && !failed && (certificate?.status === "pending" || polling);

  const step1State: StepState = certRequested || recordCreated ? "done" : "active";
  const step2State: StepState = failed
    ? "error"
    : recordCreated
      ? generated
        ? "done"
        : waiting
          ? "active"
          : "done"
      : certRequested
        ? "active"
        : "pending";
  const step3State: StepState = failed ? "error" : pdfReady ? "done" : "pending";

  const headline = failed
    ? "Certificate could not be prepared"
    : pdfReady
      ? "Your certificate is ready — download it"
      : awaitingApproval
        ? "Finalising your certificate…"
        : waiting
          ? "Preparing your certificate…"
          : certRequested
            ? "Certificate request received"
            : "Preparing your certificate…";

  const headlineClass = failed
    ? "text-red-200"
    : pdfReady
      ? "text-emerald-200"
      : awaitingApproval
        ? "text-amber-200"
        : "text-violet-200";

  return (
    <div
      className="rounded-lg border border-violet-400/25 bg-violet-500/8 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <p className={`text-xs font-bold uppercase tracking-wide ${headlineClass}`}>
        {headline}
        {waiting && polling ? (
          <span className="ml-2 font-normal normal-case text-gray-400">Please wait a moment</span>
        ) : null}
      </p>

      <ol className="mt-3 space-y-2.5">
        <StepRow
          state={step1State}
          label="Course completed"
          detail={
            certRequested
              ? "You finished all modules and exams — your certificate was requested."
              : undefined
          }
        />
        <StepRow
          state={step2State}
          label={failed ? "Preparation interrupted" : "Certificate being prepared"}
          detail={
            failed
              ? "Something went wrong while preparing your certificate. Our team has been notified — contact support if this continues."
              : recordCreated
                ? waiting
                  ? "This usually takes about 15 seconds."
                  : "Your certificate has been generated."
                : certRequested
                  ? "Creating your certificate…"
                  : undefined
          }
        />
        <StepRow
          state={step3State}
          label={failed ? "Download unavailable" : "Ready to download"}
          detail={
            failed
              ? undefined
              : pdfReady
                ? "Download anytime from here or your Certificate Records."
                : "Available as soon as your certificate is ready."
          }
        />
      </ol>
    </div>
  );
}
