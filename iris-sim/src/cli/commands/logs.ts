import fs from 'node:fs';
import type { CliCommandResult } from '../cli_types.js';
import { logPath } from './state_store.js';

function readLastLines(filePath: string, count: number): string[] {
  const all = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const filtered = all.filter((l) => l.length > 0);
  return filtered.slice(Math.max(0, filtered.length - count));
}

export async function runLogs(cwd: string, opts?: { follow?: boolean; last?: number }): Promise<CliCommandResult> {
  const p = logPath(cwd);
  if (!fs.existsSync(p)) {
    console.log('⚠️ No logs available yet');
    return { exitCode: 0 };
  }
  const last = Number.isFinite(opts?.last) ? Math.max(1, Math.floor(opts?.last as number)) : 50;
  const follow = Boolean(opts?.follow);
  const lines = readLastLines(p, last);
  console.log(`📜 IRIS Logs (last ${last} lines)\n`);
  if (lines.length > 0) {
    process.stdout.write(`${lines.join('\n')}\n`);
  }
  if (!follow || process.env.IRIS_LOGS_ONCE === '1') return { exitCode: 0 };

  let position = fs.statSync(p).size;
  const watcher = fs.watch(p, () => {
    try {
      const stats = fs.statSync(p);
      if (stats.size < position) position = 0;
      if (stats.size === position) return;
      const stream = fs.createReadStream(p, { encoding: 'utf8', start: position, end: stats.size - 1 });
      stream.on('data', (chunk) => process.stdout.write(chunk));
      position = stats.size;
    } catch {
      // ignore transient file access errors
    }
  });
  await new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      watcher.close();
      resolve();
    });
    process.on('SIGTERM', () => {
      watcher.close();
      resolve();
    });
  });
  return { exitCode: 0 };
}

