#!/usr/bin/env node
/**
 * npm bin entry for `iris-audit-validate` — runs the TypeScript CLI via tsx.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

let tsxCli;
try {
  tsxCli = require.resolve('tsx/cli');
} catch {
  console.error('iris-audit-validate: tsx is required (npm install).');
  process.exit(1);
}

const script = path.join(root, 'src', 'logging', 'cli', 'audit.ts');
const result = spawnSync(process.execPath, [tsxCli, script, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
