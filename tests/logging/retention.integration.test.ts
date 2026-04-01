import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { enforceRetention } from '../../src/logging/retention';

function makeTempLogsDir(): { logDir: string; archiveDir: string; indexPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-log-ret-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'runtime.log.jsonl'), '', 'utf8');
  fs.writeFileSync(path.join(logDir, 'audit.log.jsonl'), '', 'utf8');
  return { logDir, archiveDir, indexPath };
}

describe('logging retention integration', () => {
  it('deletes archive files older than retention and updates index', () => {
    const { logDir, archiveDir, indexPath } = makeTempLogsDir();
    const oldFile = path.join(archiveDir, 'runtime-20260301-000000.jsonl');
    const keepFile = path.join(archiveDir, 'audit-20260327-120000.jsonl');
    fs.writeFileSync(oldFile, '{"timestamp":"2026-03-01T00:00:00.000Z"}\n', 'utf8');
    fs.writeFileSync(keepFile, '{"timestamp":"2026-03-27T12:00:00.000Z"}\n', 'utf8');

    const veryOld = new Date('2026-03-01T00:00:00.000Z');
    fs.utimesSync(oldFile, veryOld, veryOld);
    const recent = new Date('2026-03-27T12:00:00.000Z');
    fs.utimesSync(keepFile, recent, recent);

    const now = new Date('2026-03-27T12:30:00.000Z');
    const result = enforceRetention({
      logDir,
      archiveDir,
      indexPath,
      retentionMs: 3 * 24 * 60 * 60 * 1000,
      now: () => now,
    });

    expect(result.deleted.length).toBe(1);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(keepFile)).toBe(true);
    // Active files must not be touched.
    expect(fs.existsSync(path.join(logDir, 'runtime.log.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(logDir, 'audit.log.jsonl'))).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as { files: Array<{ name: string }> };
    expect(index.files.map((f) => f.name)).toEqual(['audit-20260327-120000.jsonl']);
  });
});

