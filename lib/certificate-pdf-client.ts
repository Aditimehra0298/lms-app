import { readJsonResponse, safeJsonParse } from "@/lib/safe-json";

/** Build download URL for stored LMS certificate PDFs (session auth — no email in URL). */
export function certificatePdfDownloadHref(
  pdfUrl: string | null | undefined,
  _email?: string | null | undefined,
  options?: { attachment?: boolean },
): string | null {
  if (!pdfUrl?.trim()) return null;
  let url = pdfUrl.trim();

  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/api/certificates/")) {
        url = `${parsed.pathname}${parsed.search}`;
      } else {
        return url;
      }
    }
  } catch {
    return url;
  }

  if (url.startsWith("/api/certificates/")) {
    // Strip any legacy ?email= from stored URLs.
    try {
      const u = new URL(url, "https://local.invalid");
      u.searchParams.delete("email");
      if (options?.attachment !== false) u.searchParams.set("download", "1");
      const q = u.searchParams.toString();
      return `${u.pathname}${q ? `?${q}` : ""}`;
    } catch {
      return url;
    }
  }
  return url;
}

function blobFromPdfBytes(buffer: ArrayBuffer): { ok: true; blob: Blob } | { ok: false; message: string } {
  if (buffer.byteLength < 128) {
    return { ok: false, message: "Downloaded file is empty." };
  }
  const header = new TextDecoder().decode(buffer.slice(0, 5));
  if (!header.startsWith("%PDF-")) {
    return { ok: false, message: "Server did not return a valid PDF file." };
  }
  return { ok: true, blob: new Blob([buffer], { type: "application/pdf" }) };
}

function parsePdfFetchError(status: number, raw: string): string {
  const parsed = safeJsonParse(raw, {} as { message?: string });
  if (parsed.message) return friendlyCertificateError(parsed.message);
  if (status === 403) return "You do not have access to this certificate. Sign in with the correct account.";
  if (status === 404) return "Certificate PDF is not saved yet. Click Generate & save certificate first.";
  if (status >= 500) return "Server error while loading certificate. Please try again.";
  if (raw.trim().startsWith("<")) return `Could not load certificate PDF (server returned HTML, status ${status}).`;
  return `Could not load certificate PDF (status ${status}).`;
}

/** Fetch a saved certificate PDF from LMS disk via POST /download (reads DB + disk). */
export async function fetchSavedCertificatePdf(
  certificateId: string,
  email: string,
  options?: { attachment?: boolean; forceRegenerate?: boolean },
): Promise<{ ok: true; blob: Blob } | { ok: false; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const id = certificateId.trim();
  if (!normalizedEmail) {
    return { ok: false, message: "Sign in to download your certificate." };
  }
  if (!id) {
    return { ok: false, message: "Certificate not found." };
  }

  const res = await fetch(`/api/certificates/${encodeURIComponent(id)}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      attachment: options?.attachment !== false,
      forceRegenerate: options?.forceRegenerate === true,
    }),
  });

  const buffer = await res.arrayBuffer();
  const raw = new TextDecoder().decode(buffer.slice(0, Math.min(500, buffer.byteLength)));

  if (!res.ok || raw.trim().startsWith("{")) {
    return { ok: false, message: parsePdfFetchError(res.status, raw) };
  }

  const pdf = blobFromPdfBytes(buffer);
  if (pdf.ok) return pdf;
  return { ok: false, message: pdf.message };
}

/** Save a PDF blob to the user's Downloads folder. */
export function savePdfBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename.replace(/[^\w.-]+/g, "_") || "certificate.pdf";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export type CertificateDownloadPhase =
  | "lookup"
  | "prepare"
  | "generate"
  | "deliver"
  | "done";

export type CertificatePdfDownloadInput = {
  certificateId?: string;
  courseSlug?: string;
  scorePercent?: number | null;
  pdfReady?: boolean;
  email: string;
  filename: string;
  onProgress?: (message: string, phase?: CertificateDownloadPhase) => void;
  openInNewTab?: boolean;
  /** Opened synchronously on click — required after async (user-gesture expires). */
  workerTab?: Window | null;
};

export type CertificatePdfDownloadResult =
  | { ok: true; cached?: boolean }
  | { ok: false; message: string };

export function friendlyCertificateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("sign in")) return "Please sign in to download your certificate.";
  if (m.includes("approval") || m.includes("awaiting admin")) return message;
  if (m.includes("complete the course") || m.includes("not found")) {
    return "Complete the course and pass all exams to unlock your certificate.";
  }
  if (m.includes("popup blocked")) return message;
  if (m.includes("empty") || m.includes("not saved") || m.includes("could not load")) {
    return "Your certificate is not ready yet. Please wait a moment and tap Try again.";
  }
  if (m.includes("n8n") || m.includes("webhook") || m.includes("workflow")) {
    return "We could not generate your certificate right now. Please try again in a few seconds.";
  }
  if (message.length > 160) {
    return "Something went wrong while preparing your certificate. Please try again.";
  }
  return message;
}

function pdfServePath(certificateId: string): string {
  return `/api/certificates/${encodeURIComponent(certificateId)}/pdf`;
}

async function resolveCertificateId(
  email: string,
  courseSlug: string,
  scorePercent?: number | null,
): Promise<string | null> {
  const listRes = await fetch(`/api/certificates`, { credentials: "include", 
    cache: "no-store",
  });
  const list = await readJsonResponse(listRes, {} as {
    ok?: boolean;
    certificates?: Array<{ id: string; courseSlug: string }>;
  });
  if (list.ok && list.certificates?.length) {
    const hit = list.certificates.find((c) => c.courseSlug === courseSlug);
    if (hit?.id) return hit.id;
  }

  const reqRes = await fetch("/api/certificates/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      learnerEmail: email,
      courseSlug,
      scorePercent: scorePercent ?? undefined,
      forceRetry: false,
    }),
  });
  const requested = await readJsonResponse(reqRes, {} as {
    ok?: boolean;
    certificate?: { id?: string };
  });
  return requested.ok && requested.certificate?.id ? requested.certificate.id : null;
}

async function isCertificateCachedOnServer(
  certificateId: string,
  email: string,
): Promise<boolean> {
  const res = await fetch(`/api/certificates/${encodeURIComponent(certificateId)}/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await readJsonResponse(res, {} as { ok?: boolean; cached?: boolean });
  return Boolean(data.ok && data.cached);
}

async function waitForArchivedCertificatePdfOnClient(
  certificateId: string,
  email: string,
  maxAttempts = 15,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await isCertificateCachedOnServer(certificateId, email)) return true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

export function writeWorkerTabLoading(
  tab: Window | null,
  title: string,
  subtitle: string,
): void {
  if (!tab || tab.closed) return;
  try {
    tab.document.title = title;
    tab.document.open();
    tab.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem}
        .box{text-align:center;max-width:320px}
        .spin{width:40px;height:40px;border:3px solid rgba(251,191,36,.25);border-top-color:#fbbf24;
          border-radius:50%;margin:0 auto 1rem;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        p{margin:0} .sub{color:#94a3b8;font-size:.875rem;margin-top:.5rem;line-height:1.5}
      </style></head><body><div class="wrap"><div class="box">
        <div class="spin"></div><p><strong>${title}</strong></p>
        <p class="sub">${subtitle}</p></div></div></body></html>`);
    tab.document.close();
  } catch {
    /* ignore */
  }
}

/** Show PDF inline in the worker tab (reliable vs bare location.href). */
function viewPdfInTab(href: string, tab: Window | null): CertificatePdfDownloadResult {
  const safe = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  if (tab && !tab.closed) {
    try {
      tab.document.open();
      tab.document.write(`<!DOCTYPE html><html><head><title>Certificate</title>
        <style>html,body{margin:0;height:100%;background:#1e293b}
        iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head>
        <body><iframe src="${safe}" title="Certificate PDF"></iframe></body></html>`);
      tab.document.close();
      tab.focus();
      return { ok: true };
    } catch {
      try {
        tab.location.href = href;
        tab.focus();
        return { ok: true };
      } catch {
        /* fall through */
      }
    }
  }
  const opened = window.open(href, "_blank");
  if (!opened) {
    return {
      ok: false,
      message: "Popup blocked. Allow popups for this site, or use Download PDF instead.",
    };
  }
  return { ok: true };
}

/** Navigate worker tab to attachment URL — works after async (no user-gesture needed). */
function downloadViaTab(href: string, tab: Window | null): CertificatePdfDownloadResult {
  if (tab && !tab.closed) {
    try {
      tab.location.href = href;
      window.setTimeout(() => {
        try {
          if (!tab.closed) tab.close();
        } catch {
          /* ignore */
        }
      }, 4000);
      return { ok: true };
    } catch {
      /* fall through */
    }
  }
  const opened = window.open(href, "_blank");
  if (!opened) {
    return {
      ok: false,
      message: "Popup blocked. Allow popups for this site, or try again.",
    };
  }
  return { ok: true };
}

function downloadBlobViaTab(
  blob: Blob,
  filename: string,
  tab: Window | null,
): CertificatePdfDownloadResult {
  const objectUrl = URL.createObjectURL(blob);
  if (tab && !tab.closed) {
    try {
      const a = tab.document.createElement("a");
      a.href = objectUrl;
      a.download = filename.replace(/[^\w.-]+/g, "_") || "certificate.pdf";
      tab.document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        try {
          if (!tab.closed) tab.close();
        } catch {
          /* ignore */
        }
      }, 3000);
      return { ok: true };
    } catch {
      URL.revokeObjectURL(objectUrl);
    }
  }
  const objectUrl2 = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl2;
  a.download = filename.replace(/[^\w.-]+/g, "_") || "certificate.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl2), 60_000);
  return { ok: true };
}

function viewBlobInTab(blob: Blob, tab: Window | null): CertificatePdfDownloadResult {
  const objectUrl = URL.createObjectURL(blob);
  if (tab && !tab.closed) {
    try {
      const safe = objectUrl.replace(/"/g, "&quot;");
      tab.document.open();
      tab.document.write(`<!DOCTYPE html><html><head><title>Certificate</title>
        <style>html,body{margin:0;height:100%;background:#1e293b}
        iframe,embed{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head>
        <body><embed src="${safe}" type="application/pdf" /></body></html>`);
      tab.document.close();
      tab.focus();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 180_000);
      return { ok: true };
    } catch {
      try {
        tab.location.href = objectUrl;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 180_000);
        return { ok: true };
      } catch {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }
  const opened = window.open(objectUrl, "_blank");
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return {
      ok: false,
      message: "Popup blocked. Allow popups for this site, or use Download PDF instead.",
    };
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 180_000);
  return { ok: true };
}

async function fetchCertificatePdfBytes(
  certificateId: string,
  email: string,
  attachment: boolean,
  forceRegenerate: boolean,
): Promise<
  | { ok: true; blob: Blob; cached: boolean }
  | { ok: false; message: string; n8nCalled?: boolean }
> {
  const res = await fetch(`/api/certificates/${encodeURIComponent(certificateId)}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, attachment, forceRegenerate }),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("pdf")) {
    const blob = await res.blob();
    if (!blob.size) return { ok: false, message: "Downloaded file is empty." };
    return {
      ok: true,
      blob,
      cached: res.headers.get("x-certificate-cached") === "1",
    };
  }
  const err = await readJsonResponse(res, {} as { message?: string; n8nCalled?: boolean });
  return {
    ok: false,
    message: err.message ?? "Could not download certificate.",
    n8nCalled: err.n8nCalled,
  };
}

export async function downloadCertificatePdf(
  input: CertificatePdfDownloadInput,
): Promise<CertificatePdfDownloadResult> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      return { ok: false, message: friendlyCertificateError("Sign in to download your certificate.") };
    }

    let certificateId = input.certificateId?.trim() ?? "";
    const openInNewTab = Boolean(input.openInNewTab);
    const workerTab = input.workerTab ?? null;

    if (!certificateId && input.courseSlug?.trim()) {
      input.onProgress?.("Finding your certificate…", "lookup");
      certificateId =
        (await resolveCertificateId(email, input.courseSlug.trim(), input.scorePercent)) ?? "";
      if (!certificateId) {
        return {
          ok: false,
          message: friendlyCertificateError("Certificate not found. Complete the course first."),
        };
      }
    }

    if (!certificateId) {
      return {
        ok: false,
        message: friendlyCertificateError("Certificate not found. Complete the course first."),
      };
    }

    let cached = Boolean(input.pdfReady);
    if (!cached) {
      input.onProgress?.("Checking your certificate…", "prepare");
      cached = await isCertificateCachedOnServer(certificateId, email);
    }

    if (cached) {
      input.onProgress?.(
        openInNewTab ? "Opening your certificate…" : "Starting download…",
        "deliver",
      );
      const href = certificatePdfDownloadHref(pdfServePath(certificateId), email, {
        attachment: !openInNewTab,
      });
      if (href) {
        const result = openInNewTab
          ? viewPdfInTab(href, workerTab)
          : downloadViaTab(href, workerTab);
        if (result.ok) {
          input.onProgress?.(
            openInNewTab ? "Certificate opened in new tab." : "Download started.",
            "done",
          );
          return { ok: true, cached: true };
        }
        if (workerTab && !workerTab.closed) workerTab.close();
        return { ok: false, message: friendlyCertificateError(result.message) };
      }
    }

    writeWorkerTabLoading(
      workerTab,
      openInNewTab ? "Generating certificate" : "Preparing download",
      "First time only — about 10–15 seconds.",
    );
    input.onProgress?.("Generating your official PDF…", "generate");

    let pdf = await fetchCertificatePdfBytes(certificateId, email, !openInNewTab, false);
    if (!pdf.ok) {
      input.onProgress?.("Still preparing your PDF…", "generate");
      await waitForArchivedCertificatePdfOnClient(certificateId, email);
      pdf = await fetchCertificatePdfBytes(certificateId, email, !openInNewTab, false);
    }

    if (!pdf.ok) {
      if (workerTab && !workerTab.closed) workerTab.close();
      return { ok: false, message: friendlyCertificateError(pdf.message) };
    }

    input.onProgress?.(
      openInNewTab ? "Opening your certificate…" : "Saving to your device…",
      "deliver",
    );

    if (openInNewTab) {
      const opened = viewBlobInTab(pdf.blob, workerTab);
      if (!opened.ok) {
        return { ok: false, message: friendlyCertificateError(opened.message) };
      }
      input.onProgress?.("Certificate opened in new tab.", "done");
      return { ok: true, cached: pdf.cached };
    }

    downloadBlobViaTab(pdf.blob, input.filename, workerTab);
    input.onProgress?.("Download started.", "done");
    return { ok: true, cached: pdf.cached };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return { ok: false, message: friendlyCertificateError(msg) };
  }
}
