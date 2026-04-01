import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  AUDIT_COMPLIANCE_VERSION,
  exportAuditSnapshot,
  hashIndexFileContent,
  stableStringify,
  validateAuditSnapshot,
} from '../../src/logging/audit';
import { rebuildLogIndex } from '../../src/logging/indexer';

function line(ts: string, cid: string, extra: Record<string, unknown> = {}): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId: 'snap-r',
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'x',
    audit: { compliant: true },
    ...extra,
  })}\n`;
}

function setupLogs(): { root: string; indexPath: string; outDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-snap-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'r1.jsonl'), line('2026-01-01T00:00:00.000Z', 'c1'), 'utf8');
  fs.writeFileSync(
    path.join(archiveDir, 'a1.jsonl'),
    line('2026-01-01T00:01:00.000Z', 'c2', {
      invariantId: 'INV-010',
      audit: { compliant: false, onFailure: 'AUDIT_FLAG' },
    }),
    'utf8',
  );
  rebuildLogIndex({
    indexPath,
    archiveDir,
    logDir,
    now: () => new Date('2026-01-01T01:00:00.000Z'),
  });
  return { root, indexPath, outDir };
}

describe('audit snapshot export (16F.4)', () => {
  it('writes snapshot with required fields and deterministic stableStringify hash', () => {
    const { indexPath, outDir } = setupLogs();
    const frozen = new Date('2026-06-15T10:20:30.000Z');
    const snap = exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      runtimeId: 'snap-r',
      now: () => frozen,
    });

    expect(snap.version).toBeTruthy();
    expect(snap.complianceVersion).toBe(AUDIT_COMPLIANCE_VERSION);
    expect(snap.generatedAt).toBe(frozen.toISOString());
    expect(snap.runtimeId).toBe('snap-r');
    expect(snap.indexHash).toBe(hashIndexFileContent(fs.readFileSync(indexPath, 'utf8')));
    expect(snap.logEntries.length).toBe(2);
    expect(snap.traceability.length).toBe(1);
    expect(snap.traceability[0]!.invariantId).toBe('INV-010');
    expect(snap.runtime?.activeComponentsList).toContain('snap-r');
    expect(snap.runtime?.state).toMatch(/ACTIVE|DEGRADED|FAILED/);
    expect(snap.sdkClosure?.auditMode).toBe('STRICT');
    expect(snap.sdkClosure?.unsafeReplayUsed).toBe(false);
    expect(snap.sdkClosure?.invariantEnforcement?.length).toBeGreaterThan(0);

    const written = fs.readdirSync(outDir).filter((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'));
    expect(written.length).toBe(1);
    const body = fs.readFileSync(path.join(outDir, written[0]!), 'utf8');
    const parsed = JSON.parse(body) as { logEntries: unknown[] };
    expect(parsed.logEntries.length).toBe(2);

    const h1 = hashIndexFileContent(stableStringify({ entries: snap.logEntries, trace: snap.traceability }));
    const h2 = hashIndexFileContent(stableStringify({ entries: snap.logEntries, trace: snap.traceability }));
    expect(h1).toBe(h2);
  });

  it('writes gzip sibling when compress is true and optional replay log atomically', () => {
    const { indexPath, outDir } = setupLogs();
    const replayPath = path.join(outDir, 'replay.log.json');
    exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      compress: true,
      replayLogPath: replayPath,
      now: () => new Date('2026-06-15T12:00:00.000Z'),
    });

    const gzName = fs.readdirSync(outDir).find((f) => f.endsWith('.json.gz'));
    expect(gzName).toBeDefined();
    const gzPath = path.join(outDir, gzName!);
    expect(fs.existsSync(gzPath)).toBe(true);
    const roundTrip = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8');
    expect(JSON.parse(roundTrip).indexHash).toBe(hashIndexFileContent(fs.readFileSync(indexPath, 'utf8')));

    const tmpLeft = fs.readdirSync(outDir).filter((f) => f.includes('.tmp'));
    expect(tmpLeft.length).toBe(0);

    const replayed = JSON.parse(fs.readFileSync(replayPath, 'utf8')) as unknown[];
    expect(replayed.length).toBe(2);
  });

  it('validateAuditSnapshot passes for fresh export and fails when tampered', () => {
    const { indexPath, outDir } = setupLogs();
    exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      now: () => new Date('2026-07-01T00:00:00.000Z'),
    });
    const file = path.join(outDir, fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-'))!);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ok = validateAuditSnapshot(raw, true);
    expect(ok.valid).toBe(true);
    expect(ok.report[0]).toBe('VALID');

    (raw.logEntries[0] as { level: string }).level = 'INVALID';
    const bad = validateAuditSnapshot(raw, true);
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('logEntries'))).toBe(true);
  });
});
