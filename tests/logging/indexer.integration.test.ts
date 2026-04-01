import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { rebuildLogIndex, validateReplayIndex } from '../../src/logging/indexer';
import { createLogger } from '../../src/logging/logger';
import { rotateIfNeeded } from '../../src/logging/rotation';
import { validateLogEntry } from '../../src/logging/validator';

function makeTempLogsDir(): { logDir: string; archiveDir: string; indexPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-log-idx-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  fs.mkdirSync(archiveDir, { recursive: true });
  return { logDir, archiveDir, indexPath };
}

function hashContent(content: string): string {
  return `sha256-${crypto.createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

describe('logging indexer integration', () => {
  it('builds index.json with valid structure, counts, ranges and hashes', () => {
    const { logDir, archiveDir, indexPath } = makeTempLogsDir();
    const runtimeFile = path.join(archiveDir, 'runtime-20260327-120000.jsonl');
    const auditFile = path.join(archiveDir, 'audit-20260327-120100.jsonl');

    const runtimeContent =
      '{"timestamp":"2026-03-27T12:00:00.000Z","runtimeId":"r1","correlationId":"corr-000001","level":"INFO","phase":"INIT","message":"a","audit":{"compliant":true}}\n' +
      '{"timestamp":"2026-03-27T12:00:02.000Z","runtimeId":"r1","correlationId":"corr-000002","level":"INFO","phase":"RUNTIME","message":"b","audit":{"compliant":true}}\n';
    const auditContent =
      '{"timestamp":"2026-03-27T12:01:00.000Z","runtimeId":"r1","correlationId":"corr-000003","level":"ERROR","phase":"VALIDATION","invariantId":"INV-001","message":"c","audit":{"compliant":false,"onFailure":"FAIL_FAST"}}\n';

    fs.writeFileSync(runtimeFile, runtimeContent, 'utf8');
    fs.writeFileSync(auditFile, auditContent, 'utf8');

    const index = rebuildLogIndex({
      logDir,
      archiveDir,
      indexPath,
      now: () => new Date('2026-03-27T12:10:00.000Z'),
    });

    expect(index.version).toBe('1.0');
    expect(index.files.length).toBe(2);
    const runtimeEntry = index.files.find((f) => f.name.startsWith('runtime-'))!;
    const auditEntry = index.files.find((f) => f.name.startsWith('audit-'))!;
    expect(runtimeEntry.sequence).toBe(2);
    expect(auditEntry.sequence).toBe(1);
    expect(auditEntry.prevHash).toBeNull();
    expect(runtimeEntry.prevHash).toBe(auditEntry.hash);
    expect(runtimeEntry.entries).toBe(2);
    expect(runtimeEntry.startTimestamp).toBe('2026-03-27T12:00:00.000Z');
    expect(runtimeEntry.endTimestamp).toBe('2026-03-27T12:00:02.000Z');
    expect(runtimeEntry.hash).toBe(hashContent(runtimeContent));
    expect(auditEntry.entries).toBe(1);
    expect(auditEntry.hash).toBe(hashContent(auditContent));

    const onDisk = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as { files: unknown[] };
    expect(onDisk.files.length).toBe(2);
  });

  it('replays logs from index in order and validates all entries', () => {
    const { logDir, archiveDir, indexPath } = makeTempLogsDir();
    const prevDir = process.env.IRIS_LOG_DIR;
    const prevMax = process.env.IRIS_LOG_MAX_BYTES;
    process.env.IRIS_LOG_DIR = logDir;
    process.env.IRIS_LOG_MAX_BYTES = '1';

    try {
      const runtimeId = `it-replay-${Date.now()}`;
      const logger = createLogger(runtimeId);
      logger.log({
        runtimeId,
        level: 'INFO',
        phase: 'INIT',
        message: 'init',
        audit: { compliant: true },
      });
      rotateIfNeeded('runtime', {
        logDir,
        archiveDir,
        maxBytes: 1,
        maxAgeMs: 24 * 60 * 60 * 1000,
        now: () => new Date('2026-03-27T12:00:00.000Z'),
      });
      logger.logInvariant('INV-011', true, { replay: true });
      rotateIfNeeded('runtime', {
        logDir,
        archiveDir,
        maxBytes: 1,
        maxAgeMs: 24 * 60 * 60 * 1000,
        now: () => new Date('2026-03-27T12:00:01.000Z'),
      });
      logger.logNonDeterministic('ND-001', { clock: 'utc' });

      const index = rebuildLogIndex({ logDir, archiveDir, indexPath });
      const replayFiles = [...index.files].sort((a, b) => a.sequence - b.sequence);
      const reconstructed: unknown[] = [];
      for (const file of replayFiles) {
        const abs = path.join(process.cwd(), file.path);
        const lines = fs
          .readFileSync(abs, 'utf8')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        for (const line of lines) {
          reconstructed.push(JSON.parse(line));
        }
      }

      expect(reconstructed.length).toBeGreaterThan(0);
      for (const entry of reconstructed) {
        expect(validateLogEntry(entry).valid).toBe(true);
      }
      const replayValidation = validateReplayIndex(index, { logDir, archiveDir, indexPath });
      expect(replayValidation.valid).toBe(true);
      expect(replayValidation.errors).toEqual([]);
    } finally {
      if (prevDir === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prevDir;
      if (prevMax === undefined) delete process.env.IRIS_LOG_MAX_BYTES;
      else process.env.IRIS_LOG_MAX_BYTES = prevMax;
    }
  });

  it('detects tampering through replay index hash validation', () => {
    const { logDir, archiveDir, indexPath } = makeTempLogsDir();
    const runtimeFile = path.join(archiveDir, 'runtime-20260327-120000.jsonl');
    fs.writeFileSync(
      runtimeFile,
      '{"timestamp":"2026-03-27T12:00:00.000Z","runtimeId":"r1","correlationId":"corr-000001","level":"INFO","phase":"INIT","message":"ok","audit":{"compliant":true}}\n',
      'utf8',
    );
    const index = rebuildLogIndex({ logDir, archiveDir, indexPath });
    // Tamper archived file after index generation.
    fs.appendFileSync(runtimeFile, '{"tampered":true}\n', 'utf8');
    const validation = validateReplayIndex(index, { logDir, archiveDir, indexPath });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('hash mismatch'))).toBe(true);
  });

  it('enforces durability fsync on logger write path', () => {
    const { logDir } = makeTempLogsDir();
    const prevDir = process.env.IRIS_LOG_DIR;
    process.env.IRIS_LOG_DIR = logDir;
    const spy = vi.spyOn(fs, 'fsyncSync');
    try {
      const logger = createLogger(`it-durable-${Date.now()}`);
      logger.log({
        runtimeId: `it-durable-${Date.now()}`,
        level: 'INFO',
        phase: 'RUNTIME',
        message: 'durable write',
        audit: { compliant: true },
      });
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      if (prevDir === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prevDir;
    }
  });
});

