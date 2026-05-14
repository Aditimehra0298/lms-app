import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'vendor', 'nanoid-non-secure.cjs');
const targetDir = path.join(root, 'node_modules', 'nanoid', 'non-secure');
const targetCjs = path.join(targetDir, 'index.cjs');
const targetJs = path.join(targetDir, 'index.js');

try {
  if (!existsSync(source)) process.exit(0);
  mkdirSync(targetDir, { recursive: true });

  if (!existsSync(targetCjs)) {
    copyFileSync(source, targetCjs);
  }
  if (!existsSync(targetJs)) {
    copyFileSync(source, targetJs);
  }
} catch {
  // Best-effort fix for broken nanoid installs.
}
