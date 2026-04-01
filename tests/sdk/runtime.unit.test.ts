import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { rebuildLogIndex } from '../../src/logging/indexer';

function line(ts: string, runtimeId: string, cid: string, extra: Record<string, unknown> = {}): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId,
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'u',
    audit: { compliant: true },
    ...extra,
  })}\n`;
}

function makeArchives(): { logDir: string; indexPath: string; archiveDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sdk-u-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(
    path.join(archiveDir, 'r-a.jsonl'),
    line('2026-01-01T00:00:00.000Z', 'run-a', 'c1') + line('2026-01-01T00:01:00.000Z', 'run-b', 'c2'),
    'utf8',
  );
  rebuildLogIndex({ logDir, archiveDir, indexPath, now: () => new Date('2026-01-01T02:00:00.000Z') });
  return { logDir, indexPath, archiveDir };
}

describe('sdk runtime (16F.5) unit', () => {
  it('replayAuditEntries filters by runtimeId deterministically', async () => {
    const { logDir, indexPath } = makeArchives();
    const { replayAuditEntries } = await import('../../src/sdk/runtime');
    const ctx = { resolution: { mode: 'explicit' as const, logDir, indexPath } };
    const onlyA = replayAuditEntries({ runtimeId: 'run-a' }, ctx);
    expect(onlyA.map((e) => e.correlationId)).toEqual(['c1']);
    const all = replayAuditEntries(undefined, ctx);
    expect(all.map((e) => e.correlationId)).toEqual(['c1', 'c2']);
  });

  it('validateAuditSnapshot enforces ADR compliance version when core validation passes', async () => {
    const { logDir, indexPath } = makeArchives();
    const outDir = path.join(logDir, 'out');
    const { exportAuditSnapshot: exp, validateAuditSnapshot: validateSnap } = await import('../../src/sdk/runtime');
    exp({ resolution: { mode: 'explicit', logDir, indexPath }, outputDir: outDir, allowOverwrite: true });
    const fp = path.join(
      outDir,
      fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'))!,
    );
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8')) as { complianceVersion: string };
    raw.complianceVersion = '16F.4.0';
    fs.writeFileSync(fp, JSON.stringify(raw, null, 2), 'utf8');
    const r = validateSnap(fp);
    expect(r.adrCompliance.aligned).toBe(false);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('ADR compliance'))).toBe(true);
    expect(r.compliance.failureClassification).toBe('adr_version');
    expect(r.compliance.failureClassifications).toContain('adr_version');
  });

  it('normalizeAuditSnapshot(compare) matches for same index despite different generatedAt', async () => {
    const { logDir, indexPath } = makeArchives();
    const { exportAuditSnapshot: exp, normalizeAuditSnapshot } = await import('../../src/sdk/runtime');
    const { stableStringify } = await import('../../src/logging/audit');
    const out1 = path.join(logDir, 'c1');
    const out2 = path.join(logDir, 'c2');
    fs.mkdirSync(out1, { recursive: true });
    fs.mkdirSync(out2, { recursive: true });
    const s1 = exp({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out1,
      allowOverwrite: true,
      determinism: { snapshotGeneratedAt: '2026-01-01T00:00:00.000Z' },
    });
    const s2 = exp({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: out2,
      allowOverwrite: true,
      determinism: { snapshotGeneratedAt: '2026-06-06T00:00:00.000Z' },
    });
    expect(s1.generatedAt).not.toBe(s2.generatedAt);
    expect(stableStringify(normalizeAuditSnapshot(s1, 'compare'))).toBe(
      stableStringify(normalizeAuditSnapshot(s2, 'compare')),
    );
  });

  it('strict validate rejects relaxed-export snapshot (attestation isolation)', async () => {
    const { logDir, indexPath } = makeArchives();
    const outDir = path.join(logDir, 'out-strictiso');
    fs.mkdirSync(outDir, { recursive: true });
    const { exportAuditSnapshot: exp, validateAuditSnapshot: validateSnap } = await import('../../src/sdk/runtime');
    exp({
      resolution: { mode: 'explicit', logDir, indexPath },
      outputDir: outDir,
      allowOverwrite: true,
      determinism: { snapshotGeneratedAt: '2026-08-08T00:00:00.000Z' },
      auditLevel: 'relaxed',
    });
    const fp = path.join(
      outDir,
      fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'))!,
    );
    const r = validateSnap(fp, { auditLevel: 'strict' });
    expect(r.valid).toBe(false);
    expect(r.compliance.failureClassification).toBe('strict_attestation');
  });

  it('enforceInvariant catches duplicate replay ordinals', async () => {
    const { enforceInvariant, ADR003_INVARIANT_IDS } = await import('../../src/sdk/invariants');
    const badTagged = [
      {
        entry: {
          timestamp: '2026-01-01T00:00:00.000Z',
          runtimeId: 'r',
          correlationId: 'c1',
          level: 'INFO',
          phase: 'INIT',
          message: 'm',
          audit: { compliant: true },
        } as const,
        sourceArchive: 'a.jsonl',
        indexSequence: 1,
        replayOrdinal: 1,
      },
      {
        entry: {
          timestamp: '2026-01-01T00:00:01.000Z',
          runtimeId: 'r',
          correlationId: 'c2',
          level: 'INFO',
          phase: 'INIT',
          message: 'm2',
          audit: { compliant: true },
        } as const,
        sourceArchive: 'a.jsonl',
        indexSequence: 1,
        replayOrdinal: 1,
      },
    ];
    const r = enforceInvariant(ADR003_INVARIANT_IDS.REPLAY_ORDINAL_UNIQUE, badTagged);
    expect(r.status).toBe('VIOLATED');
  });

  it('exportAuditSnapshot resolves deterministic index via resolution.cwd (no IRIS_* )', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sdk-det-exp-'));
    const detLogDir = path.join(cwd, 'artifacts/logs');
    const detIndex = path.join(detLogDir, 'index.json');
    const archDir = path.join(detLogDir, 'archive');
    fs.mkdirSync(archDir, { recursive: true });
    fs.writeFileSync(
      path.join(archDir, 'seg.jsonl'),
      line('2026-01-01T00:00:00.000Z', 'run-x', 'cx'),
      'utf8',
    );
    rebuildLogIndex({ logDir: detLogDir, archiveDir: archDir, indexPath: detIndex });
    const outDir = path.join(detLogDir, 'out');
    const { exportAuditSnapshot: exp } = await import('../../src/sdk/runtime');
    exp({ resolution: { mode: 'deterministic', cwd }, outputDir: outDir, allowOverwrite: true });
    const json = fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'));
    expect(json).toBeDefined();
    const body = JSON.parse(fs.readFileSync(path.join(outDir, json!), 'utf8')) as { indexPath: string };
    expect(path.resolve(body.indexPath)).toBe(path.resolve(detIndex));
  });

  it('createRuntimeLogger invokes onAfterEmit with read-only contract (no extra writes)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sdk-hook-'));
    const prev = process.env.IRIS_LOG_DIR;
    process.env.IRIS_LOG_DIR = root;
    const hook = vi.fn();
    const { createRuntimeLogger } = await import('../../src/sdk/runtime');
    try {
      const logger = createRuntimeLogger('hook-rt', { onAfterEmit: hook });
      logger.log({
        runtimeId: 'hook-rt',
        level: 'INFO',
        phase: 'RUNTIME',
        message: 'hi',
        audit: { compliant: true },
      });
      expect(hook).toHaveBeenCalledTimes(1);
      expect(hook.mock.calls[0]![0]).toMatchObject({ runtimeId: 'hook-rt', correlationId: 'corr-000001' });
    } finally {
      if (prev === undefined) delete process.env.IRIS_LOG_DIR;
      else process.env.IRIS_LOG_DIR = prev;
    }
  });

  it('AUDIT_COMPLIANCE_VERSION is 16F.4.1', async () => {
    const m = await import('../../src/sdk/runtime');
    expect(m.AUDIT_COMPLIANCE_VERSION).toBe('16F.4.1');
  });
});
