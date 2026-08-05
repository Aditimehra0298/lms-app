/**
 * Upload a public image for catalog / marketing / page content.
 * Uses `/api/admin/upload-cover` so files land in `public/uploads/covers/`
 * and display on the server without signed media tokens.
 */
export async function uploadAdminImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/admin/upload-cover", { method: "POST", body: fd });
  } catch {
    throw new Error("Upload failed — check your connection and try again.");
  }

  let data: { ok?: boolean; url?: string; error?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    if (res.status === 413) {
      throw new Error("File too large for the server. Use a smaller image (max 6 MB).");
    }
    throw new Error(`Upload failed (HTTP ${res.status}).`);
  }

  if (!res.ok || !data.url?.trim()) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url.trim();
}
