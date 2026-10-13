#!/usr/bin/env node
// Shrink oversized images in public/ in place (same file names, same formats).
//   node scripts/compress-public-images.mjs            → files over 400 KB
//   MIN_KB=200 MAX_WIDTH=1600 node scripts/compress-public-images.mjs
// Originals are copied to BACKUP_DIR (default ../public-originals-backup) before overwriting.
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(ROOT, "..", "public-originals-backup"));
const MIN_BYTES = Number(process.env.MIN_KB || 400) * 1024;
const MAX_WIDTH = Number(process.env.MAX_WIDTH || 1920);
const LOGO_MAX_WIDTH = 800;

const isLogo = (name) => /logo|badge|icon|favicon/i.test(name);

async function compress(file) {
  const input = path.join(PUBLIC_DIR, file);
  const ext = path.extname(file).toLowerCase();
  const before = (await stat(input)).size;
  if (before < MIN_BYTES) return null;

  const meta = await sharp(input).metadata();
  const maxWidth = isLogo(file) ? LOGO_MAX_WIDTH : MAX_WIDTH;
  let pipeline = sharp(input, { failOn: "none" }).rotate();
  if ((meta.width ?? 0) > maxWidth) pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });

  if (ext === ".png") {
    pipeline = pipeline.png({ palette: true, quality: 88, effort: 10, compressionLevel: 9 });
  } else if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true, progressive: true });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 82, effort: 6 });
  } else {
    return null;
  }

  const out = await pipeline.toBuffer();
  if (out.length >= before * 0.9) return { file, before, after: before, skipped: true };

  await mkdir(BACKUP_DIR, { recursive: true });
  await copyFile(input, path.join(BACKUP_DIR, file)).catch(() => {});
  await writeFile(input, out);
  return { file, before, after: out.length, skipped: false };
}

const files = (await readdir(PUBLIC_DIR, { withFileTypes: true }))
  .filter((d) => d.isFile() && /\.(png|jpe?g|webp)$/i.test(d.name))
  .map((d) => d.name);

let saved = 0;
for (const file of files) {
  try {
    const r = await compress(file);
    if (!r || r.skipped) continue;
    saved += r.before - r.after;
    console.log(`${file.padEnd(48)} ${(r.before / 1024).toFixed(0).padStart(6)} KB → ${(r.after / 1024).toFixed(0).padStart(5)} KB`);
  } catch (err) {
    console.error(`skip ${file}: ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`\nSaved ${(saved / 1024 / 1024).toFixed(1)} MB. Originals backed up in ${BACKUP_DIR}`);
