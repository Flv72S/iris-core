import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePid } from './commands/state_store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function spawnDaemonStart(cwd: string): number {
  const cliEntry = path.join(__dirname, 'cli.js');
  const child = spawn(process.execPath, [cliEntry, 'start', '--internal'], {
    cwd,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  if (!child.pid) throw new Error('Failed to spawn daemon process');
  writePid(cwd, child.pid);
  return child.pid;
}

