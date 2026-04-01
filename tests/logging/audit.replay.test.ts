import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ReplayIndexError,
  rebuildLogIndex,
  replayFromIndex,
  validateReplayIndex,
} from '../../src/logging/indexer';

function entryLine(
  ts: string,
  correlationId: string,
  extra: Record<string, unknown> = {},
): string {
  return `${JSON.stringify({
    timestamp: ts,
    runtimeId: 'r-audit',
    correlationId,
    level: 'INFO',
    phase: 'RUNTIME',
    message: 'm',
    audit: { compliant: true },
    ...extra,
  })}\n`;
}

function makeTempIndex(): { root: string; indexPath: string; archiveDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-replay-'));
  const logDir = path.join(root, 'logs');
  const archiveDir = path.join(logDir, 'archive');
  const indexPath = path.join(logDir, 'index.json');
  fs.mkdirSync(archiveDir, { recursive: true });
  return { root, indexPath, archiveDir };
}

describe('audit replay (16F.4)', () => {
  it('reconstructs full log in chronological order with deterministic ties', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    const f1 = path.join(archiveDir, 'audit-a.jsonl');
    const f2 = path.join(archiveDir, 'runtime-b.jsonl');
    // Same timestamp, different correlationId — order by correlationId.
    fs.writeFileSync(
      f1,
      entryLine('2026-03-27T12:00:00.000Z', 'corr-b') + entryLine('2026-03-27T11:00:00.000Z', 'corr-a'),
      'utf8',
    );
    fs.writeFileSync(f2, entryLine('2026-03-27T12:00:00.000Z', 'corr-c'), 'utf8');

    rebuildLogIndex({
      indexPath,
      archiveDir,
      logDir: path.dirname(archiveDir),
      now: () => new Date('2026-03-27T12:30:00.000Z'),
    });

    const rows = replayFromIndex(indexPath);
    expect(rows.map((r) => r.correlationId)).toEqual(['corr-a', 'corr-b', 'corr-c']);
  });

  it('filters by time range, invariantId, and nondeterministicOnly', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    const file = path.join(archiveDir, 'runtime-one.jsonl');
    fs.writeFileSync(
      file,
      entryLine('2026-03-27T10:00:00.000Z', 'c1') +
        entryLine('2026-03-27T12:00:00.000Z', 'c2', {
          invariantId: 'INV-001',
          audit: { compliant: false, onFailure: 'FAIL_FAST' },
        }) +
        entryLine('2026-03-27T14:00:00.000Z', 'c3', { nondeterministicMarker: 'ND-001' }) +
        entryLine('2026-03-27T16:00:00.000Z', 'c4', { invariantId: 'INV-002' }),
      'utf8',
    );
    rebuildLogIndex({
      indexPath,
      archiveDir,
      logDir: path.dirname(archiveDir),
    });

    const byTime = replayFromIndex(indexPath, {
      startTime: '2026-03-27T11:00:00.000Z',
      endTime: '2026-03-27T15:00:00.000Z',
    });
    expect(byTime.map((r) => r.correlationId)).toEqual(['c2', 'c3']);

    const byInv = replayFromIndex(indexPath, { invariantIds: ['INV-001'] });
    expect(byInv.map((r) => r.correlationId)).toEqual(['c2']);

    const ndOnly = replayFromIndex(indexPath, { nondeterministicOnly: true });
    expect(ndOnly.map((r) => r.correlationId)).toEqual(['c3']);
  });

  it('returns empty stream for empty archive index', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    rebuildLogIndex({
      indexPath,
      archiveDir,
      logDir: path.dirname(archiveDir),
    });
    expect(validateReplayIndex(JSON.parse(fs.readFileSync(indexPath, 'utf8'))).valid).toBe(true);
    expect(replayFromIndex(indexPath)).toEqual([]);
  });

  it('throws ReplayIndexError on broken chain, missing file, or hash mismatch', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    const rf = path.join(archiveDir, 'runtime-x.jsonl');
    fs.writeFileSync(rf, entryLine('2026-03-27T12:00:00.000Z', 'x1'), 'utf8');
    rebuildLogIndex({ indexPath, archiveDir, logDir: path.dirname(archiveDir) });

    fs.unlinkSync(rf);
    expect(() => replayFromIndex(indexPath)).toThrow(ReplayIndexError);
    expect(() => replayFromIndex(indexPath)).toThrow(/missing file|Replay index invalid/);

    // Hash mismatch
    const { indexPath: idx2, archiveDir: ar2 } = makeTempIndex();
    const rf2 = path.join(ar2, 'runtime-y.jsonl');
    fs.writeFileSync(rf2, entryLine('2026-03-27T12:00:00.000Z', 'y1'), 'utf8');
    rebuildLogIndex({ indexPath: idx2, archiveDir: ar2, logDir: path.dirname(ar2) });
    fs.appendFileSync(rf2, '{}\n', 'utf8');
    expect(() => replayFromIndex(idx2)).toThrow(ReplayIndexError);

    // Invalid sequence
    const { indexPath: idx3, archiveDir: ar3 } = makeTempIndex();
    fs.writeFileSync(path.join(ar3, 'a.jsonl'), entryLine('2026-03-27T12:00:00.000Z', 'a1'), 'utf8');
    fs.writeFileSync(path.join(ar3, 'b.jsonl'), entryLine('2026-03-27T12:00:01.000Z', 'b1'), 'utf8');
    const badIndex = rebuildLogIndex({ indexPath: idx3, archiveDir: ar3, logDir: path.dirname(ar3) });
    badIndex.files[0]!.sequence = 9;
    fs.writeFileSync(idx3, JSON.stringify(badIndex, null, 2), 'utf8');
    expect(() => replayFromIndex(idx3)).toThrow(ReplayIndexError);
  });

  it('handles large replay with repeated lines', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    const lines: string[] = [];
    for (let i = 0; i < 64; i++) {
      const ts = `2026-03-27T12:${String(i % 60).padStart(2, '0')}:00.000Z`;
      lines.push(entryLine(ts, `bulk-${String(i).padStart(4, '0')}`));
    }
    fs.writeFileSync(path.join(archiveDir, 'runtime-bulk.jsonl'), lines.join(''), 'utf8');
    fs.writeFileSync(
      path.join(archiveDir, 'audit-bulk.jsonl'),
      entryLine('2026-03-27T11:00:00.000Z', 'early', { nondeterministicMarker: 'ND-002' }),
      'utf8',
    );
    rebuildLogIndex({
      indexPath,
      archiveDir,
      logDir: path.dirname(archiveDir),
    });
    const all = replayFromIndex(indexPath);
    expect(all.length).toBe(65);
    const sortedTs = [...all].sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
    expect(all.map((e) => e.timestamp)).toEqual(sortedTs.map((e) => e.timestamp));
  });

  it('rejects lines that are JSON but not schema-valid log entries', () => {
    const { indexPath, archiveDir } = makeTempIndex();
    fs.writeFileSync(
      path.join(archiveDir, 'bad.jsonl'),
      entryLine('2026-03-27T12:00:00.000Z', 'ok') +
        `${JSON.stringify({
          timestamp: '2026-03-27T12:00:01.000Z',
          notAValidLog: true,
        })}\n`,
      'utf8',
    );
    rebuildLogIndex({
      indexPath,
      archiveDir,
      logDir: path.dirname(archiveDir),
    });
    expect(() => replayFromIndex(indexPath)).toThrow(ReplayIndexError);
  });
});
