import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { rebuildLogIndex } from '../../src/logging/indexer';
import { gzipAuditPayloadUtf8, stableStringify } from '../../src/logging/audit';
import {
  assertReplayBitwiseIdentical,
  assertReplayTaggedBitwiseIdentical,
  DeterminismViolationError,
  exportAuditSnapshot,
  normalizeSdkPaths,
  replayAuditEntries,
  replayAuditTaggedEntries,
  validateAuditSnapshot,
} from '../../src/sdk/runtime';
import { InvariantViolationError } from '../../src/sdk/errors';

function line(ts: string, runtimeId: string, cid: string): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId,
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'd',
    audit: { compliant: true },
  })}\n`;
}

function makeIndex(): { logDir: string; indexPath: string; archiveDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-det-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(
    path.join(archiveDir, 'b.jsonl'),
    line('2026-01-01T00:00:00.000Z', 'r1', 'c-b'),
    'utf8',
  );
  fs.writeFileSync(
    path.join(archiveDir, 'a.jsonl'),
    line('2026-01-01T00:00:00.000Z', 'r1', 'c-a'),
    'utf8',
  );
  rebuildLogIndex({ logDir, archiveDir, indexPath });
  return { logDir, indexPath, archiveDir };
}

describe('sdk runtime determinism (16F.5.FINAL)', () => {
  it('identical strict replays are bitwise equal; replayOrdinal derived from index layout', () => {
    const { logDir, indexPath } = makeIndex();
    const a = replayAuditEntries(undefined, {
      resolution: { mode: 'explicit', logDir, indexPath },
    });
    const b = replayAuditEntries(undefined, {
      resolution: { mode: 'explicit', logDir, indexPath },
    });
    assertReplayBitwiseIdentical(a, b);
    expect(a.map((e) => e.correlationId)).toEqual(['c-a', 'c-b']);
    const tagged = replayAuditTaggedEntries(undefined, {
      resolution: { mode: 'explicit', logDir, indexPath },
    });
    expect(tagged.map((t) => t.replayOrdinal)).toEqual([1, 2]);
    expect(tagged[0]!.replayOrdinal).toBeLessThan(tagged[1]!.replayOrdinal);
  });

  it('repeated snapshot export with same deterministic clock yields identical file hash', () => {
    const { logDir, indexPath } = makeIndex();
    const out = path.join(logDir, 'snap-out');
    fs.mkdirSync(out, { recursive: true });
    exportAuditSnapshot({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out,
      allowOverwrite: true,
      determinism: { snapshotGeneratedAt: '2026-03-01T00:00:00.000Z' },
    });
    const name = fs.readdirSync(out).find((f) => f.endsWith('.json'))!;
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex');
    exportAuditSnapshot({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out,
      allowOverwrite: true,
      determinism: { snapshotGeneratedAt: '2026-03-01T00:00:00.000Z' },
    });
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex');
    expect(h1).toBe(h2);
  });

  it('gzip bytes identical across runs for same canonical JSON text', () => {
    const body = `${stableStringify({ x: 1 })}\n`;
    const g1 = gzipAuditPayloadUtf8(body);
    const g2 = gzipAuditPayloadUtf8(body);
    expect(Buffer.compare(g1, g2)).toBe(0);
  });

  it('validateAuditSnapshot relaxed skips gzip sibling verification', () => {
    const { logDir, indexPath } = makeIndex();
    const out = path.join(logDir, 'snap-relaxed');
    exportAuditSnapshot({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out,
      allowOverwrite: true,
      compress: true,
      determinism: { snapshotGeneratedAt: '2026-04-02T00:00:00.000Z' },
    });
    const j = fs.readdirSync(out).find((f) => f.endsWith('.json') && !f.endsWith('.gz'))!;
    const jp = path.join(out, j);
    fs.writeFileSync(`${jp}.gz`, Buffer.from([9, 9, 9]));
    const strict = validateAuditSnapshot(jp, { auditLevel: 'strict' });
    expect(strict.valid).toBe(false);
    const relaxed = validateAuditSnapshot(jp, { auditLevel: 'relaxed' });
    expect(relaxed.valid).toBe(true);
    expect(relaxed.compliance.auditLevel).toBe('relaxed');
    expect(relaxed.compliance.enforcementStatus).toBe('PARTIAL');
    expect(relaxed.report.some((ln) => ln.includes('skipped (relaxed)'))).toBe(true);
  });

  it('validateAuditSnapshot fails SnapshotIntegrityError path when gzip sibling mismatches', () => {
    const { logDir, indexPath } = makeIndex();
    const out = path.join(logDir, 'snap-out2');
    exportAuditSnapshot({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out,
      allowOverwrite: true,
      compress: true,
      determinism: { snapshotGeneratedAt: '2026-04-01T00:00:00.000Z' },
    });
    const j = fs.readdirSync(out).find((f) => f.endsWith('.json') && !f.endsWith('.gz'))!;
    const jp = path.join(out, j);
    const gz = `${jp}.gz`;
    fs.writeFileSync(gz, Buffer.from([1, 2, 3, 4]));
    const r = validateAuditSnapshot(jp);
    expect(r.valid).toBe(false);
    expect(r.compliance.failureClassification).toBe('snapshot_integrity');
  });

  it('strict replay maps chain break to InvariantViolationError', () => {
    const { logDir, indexPath } = makeIndex();
    const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as { files: { prevHash: string | null }[] };
    raw.files[1]!.prevHash = 'sha256-dead';
    fs.writeFileSync(indexPath, JSON.stringify(raw, null, 2));
    expect(() =>
      replayAuditEntries(undefined, { resolution: { mode: 'explicit', logDir, indexPath } }),
    ).toThrow(InvariantViolationError);
  });

  it('normalizeSdkPaths deterministic/default mode does not read IRIS_LOG_DIR', () => {
    const prev = process.env.IRIS_LOG_DIR;
    process.env.IRIS_LOG_DIR = '/should-not-use-this-for-default';
    try {
      const p = normalizeSdkPaths({ mode: 'default', cwd: '/tmp/iris-cwd' });
      expect(p.logDir).toBe(path.resolve('/tmp/iris-cwd', 'artifacts/logs'));
      expect(p.indexPath).toBe(path.join(p.logDir, 'index.json'));
    } finally {
      if (prev === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prev;
    }
  });

  it('archive-scan only under relaxed + unsafeReplay (strict forbids scan)', () => {
    const { logDir, indexPath } = makeIndex();
    fs.unlinkSync(indexPath);
    expect(() =>
      replayAuditEntries(undefined, {
        resolution: { mode: 'explicit', logDir, indexPath },
        indexRecovery: 'archive-scan',
      }),
    ).toThrow(/STRICT_AUDIT_VIOLATION/);
    expect(() =>
      replayAuditEntries(undefined, {
        resolution: { mode: 'explicit', logDir, indexPath },
        indexRecovery: 'archive-scan',
        auditLevel: 'relaxed',
      }),
    ).toThrow(InvariantViolationError);
    const rows = replayAuditEntries(undefined, {
      resolution: { mode: 'explicit', logDir, indexPath },
      indexRecovery: 'archive-scan',
      unsafeReplay: true,
      auditLevel: 'relaxed',
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((e) => e.correlationId).sort()).toEqual(['c-a', 'c-b']);
  });

  it('legacy environment resolution reads IRIS_LOG_DIR for replay', () => {
    const { logDir, indexPath } = makeIndex();
    const prev = process.env.IRIS_LOG_DIR;
    const prevIdx = process.env.IRIS_LOG_INDEX_PATH;
    process.env.IRIS_LOG_DIR = logDir;
    delete process.env.IRIS_LOG_INDEX_PATH;
    try {
      const rows = replayAuditEntries({ runtimeId: 'r1' }, { resolution: { mode: 'environment' } });
      expect(rows.map((e) => e.correlationId)).toEqual(['c-a', 'c-b']);
    } finally {
      if (prev === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prev;
      if (prevIdx === undefined) delete process.env.IRIS_LOG_INDEX_PATH;
      else process.env.IRIS_LOG_INDEX_PATH = prevIdx;
    }
  });

  it('onAfterEmit mutation does not corrupt subsequent logger emits', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-mut-hook'));
    const prev = process.env.IRIS_LOG_DIR;
    process.env.IRIS_LOG_DIR = root;
    const hook = vi.fn((e: { message?: string }) => {
      e.message = 'mutated';
    });
    const { createRuntimeLogger } = await import('../../src/sdk/runtime');
    try {
      const logger = createRuntimeLogger('mut-hook', { onAfterEmit: hook });
      logger.log({
        runtimeId: 'mut-hook',
        level: 'INFO',
        phase: 'RUNTIME',
        message: 'first',
        audit: { compliant: true },
      });
      logger.log({
        runtimeId: 'mut-hook',
        level: 'INFO',
        phase: 'RUNTIME',
        message: 'second',
        audit: { compliant: true },
      });
      const logFile = path.join(root, 'runtime.log.jsonl');
      const lines = fs
        .readFileSync(logFile, 'utf8')
        .trim()
        .split('\n')
        .map((ln) => JSON.parse(ln) as { message: string });
      expect(lines[0]!.message).toBe('first');
      expect(lines[1]!.message).toBe('second');
    } finally {
      if (prev === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prev;
    }
  });

  it('assertReplayBitwiseIdentical throws DeterminismViolationError on mismatch', () => {
    expect(() =>
      assertReplayBitwiseIdentical(
        [{ timestamp: '2026-01-01T00:00:00.000Z', correlationId: 'a' }] as never,
        [{ timestamp: '2026-01-01T00:00:00.000Z', correlationId: 'b' }] as never,
      ),
    ).toThrow(DeterminismViolationError);
  });
});
