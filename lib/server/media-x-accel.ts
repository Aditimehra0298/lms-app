import path from "node:path";

/** Must match the `internal` nginx location in scripts/nginx-protected-media.conf. */
const X_ACCEL_PREFIX = "/_lms_protected_files/";

/** When enabled, nginx streams the file (sendfile + native Range) after Node has authorised it. */
export function xAccelEnabled(): boolean {
  return process.env.MEDIA_X_ACCEL === "true";
}

/**
 * Empty response telling nginx to serve `filePath` itself. Only files inside the app root can be
 * mapped; returns null otherwise so the caller falls back to streaming from Node.
 */
export function xAccelResponse(filePath: string, headers: Record<string, string>): Response | null {
  const relative = path.relative(process.cwd(), filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const encoded = relative.split(path.sep).map(encodeURIComponent).join("/");
  const { "Accept-Ranges": _ranges, "Content-Length": _length, ...rest } = headers;
  void _ranges;
  void _length;
  return new Response(null, {
    status: 200,
    headers: { ...rest, "X-Accel-Redirect": `${X_ACCEL_PREFIX}${encoded}` },
  });
}
