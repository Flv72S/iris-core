import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { rotateIfNeeded } from '../../src/logging/rotation';

function makeTempLogsDir(): { logDir: string; archiveDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-log-rot-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  return { logDir, archiveDir };
}

describe('logging rotation integration', () => {
  it('triggers rotation by size and resets active file', () => {
    const { logDir, archiveDir } = makeTempLogsDir();
    const runtimePath = path.join(logDir, 'runtime.log.jsonl');
    fs.writeFileSync(runtimePath, `${'x'.repeat(300)}\n`, 'utf8');

    const now = new Date('2026-03-27T12:00:00.000Z');
    const result = rotateIfNeeded('runtime', {
      logDir,
      archiveDir,
      maxBytes: 64,
      maxAgeMs: 24 * 60 * 60 * 1000,
      now: () => now,
    });

    expect(result.rotated).toBe(true);
    expect(result.archivedPath).toContain('runtime-20260327-120000.jsonl');
    expect(fs.existsSync(result.archivedPath!)).toBe(true);
    expect(fs.readFileSync(runtimePath, 'utf8')).toBe('');
  });

  it('triggers rotation by file age and resets active file', () => {
    const { logDir, archiveDir } = makeTempLogsDir();
    const auditPath = path.join(logDir, 'audit.log.jsonl');
    fs.writeFileSync(auditPath, '{"a":1}\n', 'utf8');
    const old = new Date('2026-03-01T00:00:00.000Z');
    fs.utimesSync(auditPath, old, old);

    const now = new Date('2026-03-27T12:00:00.000Z');
    const result = rotateIfNeeded('audit', {
      logDir,
      archiveDir,
      maxBytes: 10_000,
      maxAgeMs: 1000,
      now: () => now,
    });

    expect(result.rotated).toBe(true);
    expect(result.archivedPath).toContain('audit-20260327-120000.jsonl');
    expect(fs.readFileSync(auditPath, 'utf8')).toBe('');
  });

  it('enforces durability fsync on rotation path', () => {
    const spy = vi.spyOn(fs, 'fsyncSync');
    try {
      const { logDir, archiveDir } = makeTempLogsDir();
      const runtimePath = path.join(logDir, 'runtime.log.jsonl');
      fs.writeFileSync(runtimePath, 'entry\n', 'utf8');
      const old = new Date('2026-03-01T00:00:00.000Z');
      fs.utimesSync(runtimePath, old, old);
      rotateIfNeeded('runtime', {
        logDir,
        archiveDir,
        maxBytes: 10_000,
        maxAgeMs: 1000,
        now: () => new Date('2026-03-27T12:00:00.000Z'),
      });
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

