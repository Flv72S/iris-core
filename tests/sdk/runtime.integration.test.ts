import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { rebuildLogIndex } from '../../src/logging/indexer';
import { InvariantViolationError } from '../../src/sdk/errors';
import { rotateIfNeeded } from '../../src/logging/rotation';
import {
  createRuntimeLogger,
  exportAuditSnapshot,
  replayAuditEntries,
  replayAuditTaggedEntries,
  validateAuditSnapshot,
} from '../../src/sdk/runtime';

describe('sdk runtime (16F.5) integration', () => {
  it('end-to-end: log → rotate → index → replay → tagged export → validate', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sdk-e2e-'));
    const logDir = path.join(root, 'logs');
    const archiveDir = path.join(logDir, 'archive');
    const indexPath = path.join(logDir, 'index.json');
    const outDir = path.join(root, 'out');
    fs.mkdirSync(archiveDir, { recursive: true });

    const prevDir = process.env.IRIS_LOG_DIR;
    const prevMax = process.env.IRIS_LOG_MAX_BYTES;
    process.env.IRIS_LOG_DIR = logDir;
    process.env.IRIS_LOG_MAX_BYTES = '1';

    try {
      const logger = createRuntimeLogger('e2e-rt');
      logger.log({
        runtimeId: 'e2e-rt',
        level: 'INFO',
        phase: 'INIT',
        message: 'a',
        audit: { compliant: true },
      });
      rotateIfNeeded('runtime', {
        logDir,
        archiveDir,
        maxBytes: 1,
        maxAgeMs: 24 * 60 * 60 * 1000,
        now: () => new Date('2026-05-01T10:00:00.000Z'),
      });
      logger.logInvariant('INV-005', false, { check: true }, 'AUDIT_FLAG');
      rotateIfNeeded('runtime', {
        logDir,
        archiveDir,
        maxBytes: 1,
        maxAgeMs: 24 * 60 * 60 * 1000,
        now: () => new Date('2026-05-01T10:00:01.000Z'),
      });
      rotateIfNeeded('audit', {
        logDir,
        archiveDir,
        maxBytes: 1,
        maxAgeMs: 24 * 60 * 60 * 1000,
        now: () => new Date('2026-05-01T10:00:02.000Z'),
      });

      rebuildLogIndex({ logDir, archiveDir, indexPath, now: () => new Date('2026-05-01T11:00:00.000Z') });

      const rctx = { resolution: { mode: 'explicit' as const, logDir, indexPath } };
      const entries = replayAuditEntries({ runtimeId: 'e2e-rt' }, rctx);
      expect(entries.length).toBeGreaterThan(0);
      const ts = [...entries].sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
      expect(entries.map((e) => e.timestamp)).toEqual(ts.map((e) => e.timestamp));

      const tagged = replayAuditTaggedEntries({ invariantIds: ['INV-005'] }, rctx);
      expect(tagged.length).toBeGreaterThanOrEqual(1);
      expect(tagged[0]!.entry.invariantId).toBe('INV-005');
      expect(tagged[0]!.sourceArchive).toBeTruthy();

      exportAuditSnapshot({
        resolution: rctx.resolution,
        outputDir: outDir,
        allowOverwrite: true,
        compress: true,
        runtimeId: 'e2e-rt',
      });
      const snapName = fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'))!;
      const report = validateAuditSnapshot(path.join(outDir, snapName));
      expect(report.valid).toBe(true);
      expect(report.adrCompliance.aligned).toBe(true);
      expect(report.compliance.enforcementStatus).toBe('COMPLETE');
      expect(report.auditMode).toBe('STRICT');
      expect(report.unsafeReplayUsed).toBe(false);
      expect(report.compliance.failureClassifications).toContain('none');
      expect(report.compliance.invariantEnforcement.length).toBeGreaterThan(0);

      expect(() =>
        exportAuditSnapshot({
          resolution: rctx.resolution,
          outputDir: outDir,
          allowOverwrite: false,
        }),
      ).toThrow(/Refusing to overwrite/);
    } finally {
      if (prevDir === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prevDir;
      if (prevMax === undefined) delete process.env.IRIS_LOG_MAX_BYTES;
      else process.env.IRIS_LOG_MAX_BYTES = prevMax;
    }
  });

  it('tampered archive is detected on replay', () => {
    const { logDir, indexPath, archiveDir } = (() => {
      const r = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sdk-tamper-'));
      const ld = path.join(r, 'logs');
      const ar = path.join(ld, 'archive');
      const idx = path.join(ld, 'index.json');
      fs.mkdirSync(ar, { recursive: true });
      const content =
        '{"timestamp":"2026-06-01T00:00:00.000Z","runtimeId":"t1","correlationId":"c1","level":"INFO","phase":"INIT","message":"x","audit":{"compliant":true}}\n';
      fs.writeFileSync(path.join(ar, 'runtime-x.jsonl'), content, 'utf8');
      rebuildLogIndex({ logDir: ld, archiveDir: ar, indexPath: idx });
      return { logDir: ld, indexPath: idx, archiveDir: ar };
    })();

    const tctx = { resolution: { mode: 'explicit' as const, logDir, indexPath } };
    const arch = fs.readdirSync(archiveDir).find((f) => f.endsWith('.jsonl'))!;
    fs.appendFileSync(path.join(archiveDir, arch), '{}\n', 'utf8');
    expect(() => replayAuditEntries(undefined, tctx)).toThrow(InvariantViolationError);
  });
});
