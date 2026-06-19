/** Upload image via Admin → POST /api/admin/upload (stored under /uploads/admin or private media). */
export async function uploadAdminImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url?.trim()) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url.trim();
}
