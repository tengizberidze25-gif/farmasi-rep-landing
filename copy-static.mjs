import { cp, mkdir, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const staticExts = new Set([
  '.html',
  '.jpg',
  '.jpeg',
  '.json',
  '.mp4',
  '.pdf',
  '.png',
  '.txt',
  '.xlsx',
]);
const skipNames = new Set([
  '.git',
  'api',
  'dist',
  'node_modules',
  'scripts',
  'src',
  'index.html',
  'package-lock.json',
  'package.json',
  'tsconfig.json',
  'vercel.json',
]);

await mkdir(dist, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (skipNames.has(entry.name)) continue;

  const from = join(root, entry.name);
  const to = join(dist, entry.name);

  if (entry.isDirectory()) {
    await cp(from, to, { recursive: true });
    continue;
  }

  if (staticExts.has(extname(entry.name).toLowerCase())) {
    await cp(from, to);
  }
}
