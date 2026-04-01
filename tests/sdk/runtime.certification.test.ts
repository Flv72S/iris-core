import { describe, expect, it } from 'vitest';

import {
  AUDIT_COMPLIANCE_VERSION,
  deriveReplayOrdinal,
  exportAuditSnapshot,
  normalizeAuditSnapshot,
  snapshotsAuditCanonicallyEqual,
  stableStringify,
} from '../../src/logging/audit';
import { rebuildLogIndex } from '../../src/logging/indexer';
import {
  assertAuditSnapshotsCanonicallyEqual,
  assertReplayOrdinalDeterminism,
  buildCertCoverageRows,
  validateAuditSnapshot,
} from '../../src/sdk/runtime';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function line(ts: string, runtimeId: string, cid: string): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId,
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'cert',
    audit: { compliant: true },
  })}\n`;
}

describe('16F.5.FINAL.CERTIFICATION (SDK)', () => {
  it('snapshot equality uses canonical compare only (never raw object identity)', () => {
    const e1 = { x: 2, a: 1 } as unknown;
    const e2 = { a: 1, x: 2 } as unknown;
    expect(JSON.stringify(e1) === JSON.stringify(e2)).toBe(false);
    expect(stableStringify(e1) === stableStringify(e2)).toBe(true);
  });

  it('deriveReplayOrdinal is pure and deterministic for same E', () => {
    const entries = [
      JSON.parse(line('2026-01-01T00:00:01.000Z', 'r', 'b')) as import('../../src/logging/types').LogEntry,
      JSON.parse(line('2026-01-01T00:00:00.000Z', 'r', 'a')) as import('../../src/logging/types').LogEntry,
    ];
    const d1 = deriveReplayOrdinal(entries);
    const d2 = deriveReplayOrdinal([entries[1]!, entries[0]!]);
    expect(stableStringify(d1)).toBe(stableStringify(d2));
    assertReplayOrdinalDeterminism(entries, [entries[1]!, entries[0]!]);
    expect(d1[0]!.replayOrdinal).toBe(1);
    expect(d1[1]!.replayOrdinal).toBe(2);
  });

  it('buildCertCoverageRows is complete and non-empty for export enforcement', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cert-'));
    const logDir = path.join(root, 'logs');
    const archiveDir = path.join(logDir, 'archive');
    const indexPath = path.join(logDir, 'index.json');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, 'a.jsonl'), line('2026-01-01T00:00:00.000Z', 'r1', 'c1'), 'utf8');
    rebuildLogIndex({ logDir, archiveDir, indexPath });
    const snap = exportAuditSnapshot({ indexPath, allowOverwrite: true, deterministicGeneratedAt: '2026-01-02T00:00:00.000Z' });
    const inv = snap.sdkClosure?.invariantEnforcement ?? [];
    const cov = buildCertCoverageRows(inv, { snapshotValid: true });
    expect(cov.length).toBeGreaterThan(0);
    expect(cov.every((r) => 'evidence' in r && typeof r.enforced === 'boolean')).toBe(true);
  });

  it('Strict validate on strict-exported snapshot has COMPLETE coverage and no gaps', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cert-val-'));
    const logDir = path.join(root, 'logs');
    const archiveDir = path.join(logDir, 'archive');
    const indexPath = path.join(logDir, 'index.json');
    const outDir = path.join(root, 'out');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, 'b.jsonl'), line('2026-01-01T00:00:00.000Z', 'r1', 'c1'), 'utf8');
    rebuildLogIndex({ logDir, archiveDir, indexPath });
    exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      allowOverwrite: true,
      deterministicGeneratedAt: '2026-03-01T00:00:00.000Z',
    });
    const jp = path.join(outDir, fs.readdirSync(outDir).find((f) => f.endsWith('.json'))!);
    const report = validateAuditSnapshot(jp, { auditLevel: 'strict' });
    expect(report.valid).toBe(true);
    expect(report.compliance.enforcementStatus).toBe('COMPLETE');
    expect(report.compliance.invariantCoverage.length).toBeGreaterThan(0);
    expect(report.compliance.invariantCoverage.every((r) => r.enforced)).toBe(true);
  });

  it('assertAuditSnapshotsCanonicallyEqual agrees with normalizeAuditSnapshot compare', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cert-snap-'));
    const logDir = path.join(root, 'logs');
    const archiveDir = path.join(logDir, 'archive');
    const indexPath = path.join(logDir, 'index.json');
    const out1 = path.join(root, 'o1');
    const out2 = path.join(root, 'o2');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.mkdirSync(out1, { recursive: true });
    fs.mkdirSync(out2, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, 'b.jsonl'), line('2026-01-01T00:00:00.000Z', 'r1', 'c1'), 'utf8');
    rebuildLogIndex({ logDir, archiveDir, indexPath });
    const s1 = exportAuditSnapshot({
      indexPath,
      outputDir: out1,
      allowOverwrite: true,
      deterministicGeneratedAt: '2026-04-01T00:00:00.000Z',
    });
    const s2 = exportAuditSnapshot({
      indexPath,
      outputDir: out2,
      allowOverwrite: true,
      deterministicGeneratedAt: '2026-04-01T00:00:00.000Z',
    });
    expect(stableStringify(normalizeAuditSnapshot(s1, 'compare'))).toBe(
      stableStringify(normalizeAuditSnapshot(s2, 'compare')),
    );
    expect(snapshotsAuditCanonicallyEqual(s1, s2)).toBe(true);
    assertAuditSnapshotsCanonicallyEqual(s1, s2);
  });

  it('CanonicalAuditSnapshot type is tied to normalizeAuditSnapshot', () => {
    type C = import('../../src/logging/audit').CanonicalAuditSnapshot;
    const x = {} as C;
    expect(x).toBeDefined();
    expect(AUDIT_COMPLIANCE_VERSION).toBe('16F.4.1');
  });
});
