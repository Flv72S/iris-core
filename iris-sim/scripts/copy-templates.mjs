import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'templates');
const dest = path.join(root, 'dist', 'templates');

if (!fs.existsSync(src)) {
  console.warn('copy-templates: no templates/ folder, skipping');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('copy-templates: copied templates -> dist/templates');
