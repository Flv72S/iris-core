import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      out.push(full);
    }
  }
}

export function discoverTestSuites(): string[] {
  const distRoot = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distRoot)) return [];

  const testFiles: string[] = [];
  walk(distRoot, testFiles);

  return testFiles.map((fullPath) => path.relative(process.cwd(), fullPath).split(path.sep).join('/')).sort();
}
