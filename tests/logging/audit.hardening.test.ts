import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { describe, expect, it, vi } from 'vitest';

import {
  AUDIT_COMPLIANCE_VERSION,
  AUDIT_GZIP_LEVEL,
  AUDIT_SIGNATURE_STUB,
  AuditExportError,
  buildTraceabilityFromTagged,
  deriveSnapshotBasename,
  exportAuditSnapshot,
  hashIndexFileContent,
  stableStringify,
  validateAuditSnapshot,
  writeAtomicDurable,
} from '../../src/logging/audit';
import complianceMatrix from '../../artifacts/compliance/ADR-003-B-compliance-matrix.json';
import {
  ReplayIndexError,
  rebuildLogIndex,
  replayFromIndex,
  replayTaggedEntriesFromIndex,
} from '../../src/logging/indexer';

function line(ts: string, cid: string, extra: Record<string, unknown> = {}): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId: 'hard-r',
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'h',
    audit: { compliant: true },
    ...extra,
  })}\n`;
}

function setupLogs(): { root: string; indexPath: string; outDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-harden-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'r1.jsonl'), line('2026-01-01T00:00:00.000Z', 'h1'), 'utf8');
  fs.writeFileSync(
    path.join(archiveDir, 'a1.jsonl'),
    line('2026-01-01T00:01:00.000Z', 'h2', {
      invariantId: 'INV-003',
      audit: { compliant: false, onFailure: 'FAIL_FAST' },
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

describe('audit layer hardening (16F.4.HARDENING)', () => {
  it('uses complianceVersion 16F.4.1 and ADR-003-B matrix advertises compliance versioning', () => {
    expect(AUDIT_COMPLIANCE_VERSION).toBe('16F.4.1');
    const v = (complianceMatrix as { versioning?: { complianceVersion?: { adrVersion?: string } } }).versioning;
    expect(v?.complianceVersion?.adrVersion).toBe('003.B');
  });

  it('derives deterministic snapshot basename from indexHash and filters (no wall-clock in filename)', () => {
    const h = 'sha256-abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(deriveSnapshotBasename(h, null)).toBe('audit-snapshot-abcdef0123456789-nofilter.json');
    const f = deriveSnapshotBasename(h, { startTime: '2026-01-01T00:00:00.000Z' });
    expect(f).toMatch(/^audit-snapshot-abcdef0123456789-[0-9a-f]{12}\.json$/);
    expect(deriveSnapshotBasename(h, null)).toBe(deriveSnapshotBasename(h, null));
  });

  it('refuses overwriting snapshot artifacts by default; allowOverwrite permits replace', () => {
    const { indexPath, outDir } = setupLogs();
    exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      now: () => new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(() =>
      exportAuditSnapshot({
        indexPath,
        outputDir: outDir,
        now: () => new Date('2026-02-02T00:00:00.000Z'),
      }),
    ).toThrow(AuditExportError);
    expect(() =>
      exportAuditSnapshot({
        indexPath,
        outputDir: outDir,
        now: () => new Date('2026-02-03T00:00:00.000Z'),
        allowOverwrite: true,
      }),
    ).not.toThrow();
  });

  it('durably writes via fsync on temp file and attaches signatureStub + traceability provenance', () => {
    const { indexPath, outDir } = setupLogs();
    const sync = vi.spyOn(fs, 'fsyncSync');
    const snap = exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      replayLogPath: path.join(outDir, 'replay.json'),
      now: () => new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(sync).toHaveBeenCalled();
    sync.mockRestore();
    expect(snap.signatureStub).toEqual(AUDIT_SIGNATURE_STUB);
    expect(snap.traceability.length).toBe(1);
    expect(snap.traceability[0]!.sourceArchive).toBeDefined();
    expect(snap.traceability[0]!.indexSequence).toBeDefined();
    expect(snap.traceability[0]!.invariantId).toBe('INV-003');
    expect(snap.traceability[0]!.onFailure).toBe('FAIL_FAST');
    expect(fs.existsSync(path.join(outDir, 'replay.json'))).toBe(true);
  });

  it('produces deterministic gzip bytes at fixed level', () => {
    const body = `${stableStringify({ a: 1 })}\n`;
    const u8 = Buffer.from(body, 'utf8');
    const g1 = zlib.gzipSync(u8, { level: AUDIT_GZIP_LEVEL });
    const g2 = zlib.gzipSync(u8, { level: AUDIT_GZIP_LEVEL });
    expect(Buffer.compare(g1, g2)).toBe(0);
  });

  it('replayFromIndex is deterministic across runs and replayTagged enforces chain before parse', () => {
    const { indexPath } = setupLogs();
    const r1 = replayFromIndex(indexPath);
    const r2 = replayFromIndex(indexPath);
    expect(stableStringify(r1)).toBe(stableStringify(r2));
    const tagged = replayTaggedEntriesFromIndex(indexPath);
    expect(buildTraceabilityFromTagged(tagged).length).toBe(1);

    const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as { files: { prevHash: string | null }[] };
    raw.files[1]!.prevHash = 'sha256-bad';
    fs.writeFileSync(indexPath, JSON.stringify(raw, null, 2), 'utf8');
    expect(() => replayFromIndex(indexPath)).toThrow(ReplayIndexError);
  });

  it('validateAuditSnapshot rejects bad signatureStub and reports structured sections', () => {
    const { indexPath, outDir } = setupLogs();
    exportAuditSnapshot({
      indexPath,
      outputDir: outDir,
      now: () => new Date('2026-04-01T00:00:00.000Z'),
    });
    const name = fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'))!;
    const raw = JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8')) as Record<string, unknown>;
    const bad = validateAuditSnapshot({ ...raw, signatureStub: { algorithm: 'ed25519', signature: null, keyId: null } });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('signatureStub'))).toBe(true);
    const ok = validateAuditSnapshot(raw);
    expect(ok.valid).toBe(true);
    expect(ok.report[0]).toBe('VALID');
    expect(ok.report.join('\n')).toMatch(/Index integrity/);
    expect(ok.report.join('\n')).toMatch(/Per-entry validation/);
    expect(ok.report.join('\n')).toMatch(/Traceability/);
  });

  it('writeAtomicDurable enforces append-only when allowOverwrite false', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-atomic-'));
    const p = path.join(dir, 'out.json');
    writeAtomicDurable(p, '{}', false);
    expect(() => writeAtomicDurable(p, '{}', false)).toThrow(AuditExportError);
  });
});
