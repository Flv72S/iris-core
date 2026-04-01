import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { exportAuditSnapshot } from '../../src/logging/audit';
import { rebuildLogIndex } from '../../src/logging/indexer';

function line(ts: string, cid: string): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId: 'cli-r',
    correlationId: cid,
    level: 'INFO',
    phase: 'INIT',
    message: 'cli',
    audit: { compliant: true },
  })}\n`;
}

function makeCliFixture(): { indexPath: string; outDir: string; snapPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-cli-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'only.jsonl'), line('2026-02-01T00:00:00.000Z', 'cli-1'), 'utf8');
  rebuildLogIndex({ indexPath, archiveDir, logDir });
  exportAuditSnapshot({
    indexPath,
    outputDir: outDir,
    runtimeId: 'cli-r',
    now: () => new Date('2026-02-01T01:00:00.000Z'),
  });
  const snapName = fs.readdirSync(outDir).find((f) => f.startsWith('audit-snapshot-') && f.endsWith('.json'));
  return { indexPath, outDir, snapPath: path.join(outDir, snapName!) };
}

describe('iris-audit-validate CLI (16F.4)', () => {
  const bin = path.join(process.cwd(), 'bin', 'iris-audit-validate.mjs');

  it('exits 0 on valid snapshot and prints VALID', () => {
    const { snapPath } = makeCliFixture();
    const r = spawnSync(process.execPath, [bin, snapPath], { encoding: 'utf8' });
    expect(r.stdout).toMatch(/VALID/);
    expect(r.status).toBe(0);
  });

  it('exits 1 on tampered snapshot', () => {
    const { snapPath } = makeCliFixture();
    const raw = JSON.parse(fs.readFileSync(snapPath, 'utf8')) as { indexHash: string };
    raw.indexHash = 'sha256-deadbeef';
    fs.writeFileSync(snapPath, JSON.stringify(raw, null, 2), 'utf8');
    const r = spawnSync(process.execPath, [bin, snapPath], { encoding: 'utf8' });
    expect(r.stdout + r.stderr).toMatch(/INVALID/);
    expect(r.status).toBe(1);
  });

  it('exits 1 when snapshot file is missing', () => {
    const r = spawnSync(process.execPath, [bin, path.join(os.tmpdir(), 'missing-snapshot.json')], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
  });
});
