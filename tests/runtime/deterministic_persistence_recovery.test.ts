import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { createInitialClusterState } from '../../src/distributed/cluster_lifecycle_engine';
import { createDeterministicClock } from '../../src/runtime/clock/deterministic_clock';
import { StorageEngine } from '../../src/runtime/persistence/storage_engine';
import { ExecutionQueue } from '../../src/runtime/queue/execution_queue';

function decision(timestamp: number, action: ComplianceDecision['action'], reason: string): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action,
    reasons: Object.freeze([reason]),
    invariantIds: Object.freeze([`inv-${reason}`]),
    violationCount: 1,
    timestamp,
  });
}

async function mkQueue(path: string, nodeId = 'node-test'): Promise<ExecutionQueue> {
  await mkdir(path, { recursive: true });
  return new ExecutionQueue(
    createInitialClusterState(nodeId),
    new StorageEngine(path),
    createDeterministicClock(true),
  );
}

describe('runtime persistence and recovery (phase 16F.6.N)', () => {
  it('replays journal deterministically after restart without peers', async () => {
    const dir = join(process.cwd(), '.tmp-runtime-persist-1');
    await rm(dir, { recursive: true, force: true });
    const q1 = await mkQueue(dir, 'node-a');
    await q1.recover();
    await q1.submitDecision(decision(1, 'ESCALATE', 'a'));
    await q1.submitDecision(decision(2, 'HALT_CLUSTER', 'b'));
    const pre = q1.snapshot();
    const preJournal = q1.journalEntries();

    const q2 = await mkQueue(dir, 'node-a');
    await q2.recover();
    const post = q2.snapshot();
    const postJournal = q2.journalEntries();

    expect(JSON.stringify(post)).toBe(JSON.stringify(pre));
    expect(postJournal.map((x) => x.decisionId)).toEqual(preJournal.map((x) => x.decisionId));
  });

  it('survives partial journal write by skipping invalid entry', async () => {
    const dir = join(process.cwd(), '.tmp-runtime-persist-2');
    await rm(dir, { recursive: true, force: true });
    const q1 = await mkQueue(dir, 'node-b');
    await q1.recover();
    await q1.submitDecision(decision(1, 'ESCALATE', 'x'));

    const journalDir = join(dir, 'state', 'journal');
    await mkdir(journalDir, { recursive: true });
    await writeFile(join(journalDir, '999999999999.json'), '{"broken":', 'utf8');

    const q2 = await mkQueue(dir, 'node-b');
    await q2.recover();
    expect(q2.journalEntries().length).toBe(1);
    expect(q2.snapshot().executedActions?.includes('ESCALATE')).toBe(true);
  });

  it('is idempotent on duplicated decision submission', async () => {
    const dir = join(process.cwd(), '.tmp-runtime-persist-3');
    await rm(dir, { recursive: true, force: true });
    const q = await mkQueue(dir, 'node-c');
    await q.recover();
    const d = decision(1, 'ESCALATE', 'dup');
    await q.submitDecision(d);
    await q.submitDecision(d);
    expect(q.journalEntries().length).toBe(1);
  });
});
