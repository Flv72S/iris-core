import { describe, expect, it } from 'vitest';

import {
  deriveComplianceDecisionId,
  executeComplianceDecision,
  simulateComplianceExecution,
} from '../../src/distributed/cluster_compliance_executor';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const prop of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[prop];
    if (value !== null && (typeof value === 'object' || typeof value === 'function') && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function baseCluster() {
  return {
    globalPhase: 'RUNNING',
    transitionLocks: {},
    executionJournal: {},
    nodes: [{ id: 'n1', state: 'OK' }],
  };
}

function baseDecision(
  overrides: Partial<{
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    action:
      | 'HALT_CLUSTER'
      | 'FREEZE_TRANSITIONS'
      | 'ESCALATE'
      | 'LOG_ONLY'
      | 'NO_OP'
      | 'REQUIRE_MANUAL_INTERVENTION';
    reasons: readonly string[];
    invariantIds: readonly string[];
    timestamp: number;
  }> = {},
) {
  return {
    severity: 'CRITICAL' as const,
    action: 'HALT_CLUSTER' as const,
    reasons: ['b', 'a'] as const,
    invariantIds: ['inv2', 'inv1'] as const,
    violationCount: 0,
    timestamp: 100,
    ...overrides,
  };
}

describe('16F.6.I antibug compliance executor suite', () => {
  it('decisionId MUST be invariant to order of reasons/invariants', () => {
    const d1 = baseDecision({
      reasons: ['a', 'b'],
      invariantIds: ['x', 'y'],
    });
    const d2 = baseDecision({
      reasons: ['b', 'a'],
      invariantIds: ['y', 'x'],
    });
    expect(deriveComplianceDecisionId(d1)).toBe(deriveComplianceDecisionId(d2));
  });

  it('execute MUST NOT mutate input cluster (deep freeze)', () => {
    const cluster = deepFreeze(baseCluster());
    const decision = baseDecision();
    const result = executeComplianceDecision(cluster, decision);
    expect(result.mutatedCluster).not.toBe(cluster);
  });

  it('execution MUST be idempotent across replays', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const r1 = executeComplianceDecision(cluster, decision);
    const r2 = executeComplianceDecision(r1.mutatedCluster, decision);
    expect(r1.mutatedCluster).toEqual(r2.mutatedCluster);
  });

  it('execution journal MUST prevent duplicate execution', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const r1 = executeComplianceDecision(cluster, decision);
    const r2 = executeComplianceDecision(r1.mutatedCluster, decision);
    expect(Object.keys(r2.mutatedCluster.executionJournal ?? {}).length).toBe(1);
  });

  it('same input clones MUST produce identical outputs', () => {
    const clusterA = deepClone(baseCluster());
    const clusterB = deepClone(baseCluster());
    const decision = baseDecision();
    const r1 = executeComplianceDecision(clusterA, decision);
    const r2 = executeComplianceDecision(clusterB, decision);
    expect(r1).toEqual(r2);
  });

  it('random permutations MUST not affect output', () => {
    const permutations = [
      ['a', 'b', 'c'],
      ['c', 'b', 'a'],
      ['b', 'a', 'c'],
    ];
    const results = permutations.map((p) =>
      executeComplianceDecision(
        baseCluster(),
        baseDecision({
          reasons: p,
          invariantIds: [...p],
        }),
      ),
    );
    for (let i = 1; i < results.length; i++) {
      expect(results[0].actions).toEqual(results[i].actions);
      expect(results[0].mutatedCluster.globalPhase).toEqual(results[i].mutatedCluster.globalPhase);
      const j0 = Object.values(results[0].mutatedCluster.executionJournal ?? {})[0] as
        | { reasons?: string[]; invariantIds?: string[] }
        | undefined;
      const ji = Object.values(results[i].mutatedCluster.executionJournal ?? {})[0] as
        | { reasons?: string[]; invariantIds?: string[] }
        | undefined;
      expect([...(j0?.reasons ?? [])].sort()).toEqual([...(ji?.reasons ?? [])].sort());
      expect([...(j0?.invariantIds ?? [])].sort()).toEqual([...(ji?.invariantIds ?? [])].sort());
    }
  });

  it('STRICT and PERMISSIVE MUST be deterministic independently', () => {
    const cluster = baseCluster();
    const decision = baseDecision({ action: 'HALT_CLUSTER' });
    const strict = executeComplianceDecision(cluster, decision, { mode: 'STRICT' });
    const permissive = executeComplianceDecision(cluster, decision, { mode: 'PERMISSIVE' });
    expect(strict).not.toEqual(permissive);
    expect(executeComplianceDecision(cluster, decision, { mode: 'STRICT' })).toEqual(strict);
    expect(executeComplianceDecision(cluster, decision, { mode: 'PERMISSIVE' })).toEqual(permissive);
  });

  it('simulate MUST match execute actions', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const sim = simulateComplianceExecution(cluster, decision);
    const real = executeComplianceDecision(cluster, decision);
    expect(sim.actions).toEqual(real.actions);
  });

  it('executionTimestamp MUST be deterministic', () => {
    const cluster = baseCluster();
    const decision = baseDecision({ timestamp: 123 });
    const r = executeComplianceDecision(cluster, decision);
    expect(r.executionRecord.timestamp).toBe(123);
  });

  it('execution MUST NOT alter nodes or structure', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const r = executeComplianceDecision(cluster, decision);
    expect(r.mutatedCluster.nodes).toEqual(cluster.nodes);
  });

  it('journal MUST return same record on replay', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const r1 = executeComplianceDecision(cluster, decision);
    const r2 = executeComplianceDecision(r1.mutatedCluster, decision);
    const id = Object.keys(r2.mutatedCluster.executionJournal ?? {})[0]!;
    expect((r1.mutatedCluster.executionJournal ?? {})[id]).toEqual((r2.mutatedCluster.executionJournal ?? {})[id]);
  });

  it('actions MUST be canonical and unique', () => {
    const cluster = baseCluster();
    const decision = baseDecision();
    const r = executeComplianceDecision(cluster, decision);
    const actions = r.actions;
    expect(actions.length).toBe(new Set(actions).size);
  });
});
