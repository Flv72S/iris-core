import { describe, expect, it } from 'vitest';

import { stableStringify } from '../../src/logging/audit';
import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { createInitialClusterState } from '../../src/distributed/cluster_lifecycle_engine';
import { executeComplianceDecision } from '../../src/distributed/cluster_compliance_executor';
import { mergeClusterStates } from '../../src/distributed/conflict/compliance_merge';
import { resolveComplianceConflict } from '../../src/distributed/conflict/compliance_conflict_resolver';
import { DistributedSimulationHarness } from '../../src/distributed/simulation/distributed_simulation_harness';

function decision(overrides: Partial<ComplianceDecision> = {}): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action: 'ESCALATE',
    reasons: Object.freeze(['reason.base']),
    invariantIds: Object.freeze(['inv.base']),
    violationCount: 1,
    timestamp: 100,
    ...overrides,
  });
}

function makeState(tag: string, d: ComplianceDecision) {
  const c0 = createInitialClusterState(`node-${tag}`);
  return executeComplianceDecision(c0, d, { mode: 'STRICT', executionTimestamp: d.timestamp }).mutatedCluster;
}

describe('16F.6.J level5 deterministic conflict convergence', () => {
  it('TEST 1 — Commutativity', () => {
    const A = makeState('A', decision({ timestamp: 10, action: 'ESCALATE', reasons: Object.freeze(['A']) }));
    const B = makeState('B', decision({ timestamp: 20, action: 'FREEZE_TRANSITIONS', reasons: Object.freeze(['B']) }));
    expect(stableStringify(mergeClusterStates(A, B))).toBe(stableStringify(mergeClusterStates(B, A)));
  });

  it('TEST 2 — Associativity', () => {
    const A = makeState('A', decision({ timestamp: 10, action: 'ESCALATE', reasons: Object.freeze(['A']) }));
    const B = makeState('B', decision({ timestamp: 11, action: 'FREEZE_TRANSITIONS', reasons: Object.freeze(['B']) }));
    const C = makeState('C', decision({ timestamp: 12, action: 'REQUIRE_MANUAL_INTERVENTION', reasons: Object.freeze(['C']) }));
    const left = mergeClusterStates(A, mergeClusterStates(B, C));
    const right = mergeClusterStates(mergeClusterStates(A, B), C);
    expect(stableStringify(left)).toBe(stableStringify(right));
  });

  it('TEST 3 — Idempotency', () => {
    const A = makeState('A', decision({ timestamp: 30, action: 'HALT_CLUSTER', reasons: Object.freeze(['A']) }));
    expect(stableStringify(mergeClusterStates(A, A))).toBe(stableStringify(A));
  });

  it('TEST 4 — Conflict HALT vs ESCALATE', () => {
    const halt = decision({ timestamp: 100, action: 'HALT_CLUSTER', reasons: Object.freeze(['halt']) });
    const esc = decision({ timestamp: 90, action: 'ESCALATE', reasons: Object.freeze(['esc']) });
    const resolved = resolveComplianceConflict(halt, esc);
    expect(resolved.action).toBe('HALT_CLUSTER');
  });

  it('TEST 5 — Partition + Merge converges', () => {
    const partitionA = makeState('PA', decision({ timestamp: 101, action: 'HALT_CLUSTER', reasons: Object.freeze(['pA']) }));
    const partitionB = makeState('PB', decision({ timestamp: 102, action: 'ESCALATE', reasons: Object.freeze(['pB']) }));
    const healedAB = mergeClusterStates(partitionA, partitionB);
    const healedBA = mergeClusterStates(partitionB, partitionA);
    expect(stableStringify(healedAB)).toBe(stableStringify(healedBA));
    expect(healedAB.complianceDecision?.action).toBe('HALT_CLUSTER');
  });

  it('TEST 6 — Multi-node convergence (10 nodes)', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `n${i + 1}`);
    const h = new DistributedSimulationHarness({
      nodeIds: ids,
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1652, lossRate: 0, duplicationRate: 0.35, maxDelayTicks: 6, reorderBuffer: 20 },
    });
    for (let i = 0; i < 40; i++) {
      const id = ids[i % ids.length]!;
      h.injectDecision(id, decision({
        timestamp: 200 + i,
        action: i % 7 === 0 ? 'HALT_CLUSTER' : i % 3 === 0 ? 'FREEZE_TRANSITIONS' : 'ESCALATE',
        reasons: Object.freeze([`m${i % 5}`]),
      }));
      h.runTicks(10);
    }
    for (let round = 0; round < 12; round++) {
      for (const id of ids) h.injectStateSync(id);
      h.runTicks(100);
    }
    h.drain(6000);
    expect(h.snapshotsConverged()).toBe(true);
  });

  it('TEST 7 — Replay stability with reordered events', () => {
    const decisions = [
      decision({ timestamp: 300, action: 'ESCALATE', reasons: Object.freeze(['r1']) }),
      decision({ timestamp: 301, action: 'FREEZE_TRANSITIONS', reasons: Object.freeze(['r2']) }),
      decision({ timestamp: 302, action: 'HALT_CLUSTER', reasons: Object.freeze(['r3']) }),
    ];
    const A = decisions.reduce((acc, d) => executeComplianceDecision(acc, d, { executionTimestamp: d.timestamp }).mutatedCluster, createInitialClusterState('A'));
    const B = [...decisions].reverse()
      .reduce((acc, d) => executeComplianceDecision(acc, d, { executionTimestamp: d.timestamp }).mutatedCluster, createInitialClusterState('A'));
    expect(stableStringify(mergeClusterStates(A, B))).toBe(stableStringify(mergeClusterStates(B, A)));
  });

  it('TEST 8 — Chaos + Merge (1000 tick) no permanent divergence', () => {
    const ids = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'];
    const h = new DistributedSimulationHarness({
      nodeIds: ids,
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1653, lossRate: 0.25, duplicationRate: 0.5, maxDelayTicks: 9, reorderBuffer: 30 },
    });
    for (let i = 0; i < 80; i++) {
      const id = ids[i % ids.length]!;
      h.injectDecision(id, decision({
        timestamp: 400 + i,
        action: i % 11 === 0 ? 'HALT_CLUSTER' : i % 4 === 0 ? 'FREEZE_TRANSITIONS' : 'ESCALATE',
        reasons: Object.freeze([`c${i % 9}`]),
      }));
      h.runTicks(12);
    }
    h.runTicks(1000);
    for (let round = 0; round < 10; round++) {
      for (const id of ids) h.injectStateSync(id);
      h.runTicks(120);
    }
    h.drain(8000);
    const snapshots = Object.values(h.collectSnapshots());
    const global = snapshots.reduce((acc, cur) => mergeClusterStates(acc, cur));
    for (const s of snapshots) {
      expect(stableStringify(mergeClusterStates(s, global))).toBe(stableStringify(global));
    }
  });
});
