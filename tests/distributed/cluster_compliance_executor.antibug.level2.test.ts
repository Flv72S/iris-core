import { describe, expect, it } from 'vitest';

import { executeComplianceDecision } from '../../src/distributed/cluster_compliance_executor';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function baseCluster() {
  return {
    globalPhase: 'RUNNING',
    transitionLocks: {
      all: false,
    },
    executionJournal: {},
    executionMetadata: {},
    nodes: [
      { id: 'n1', state: { status: 'OK' } },
      { id: 'n2', state: { status: 'OK' } },
    ],
  };
}

function decision(overrides: Record<string, unknown> = {}) {
  return {
    severity: 'CRITICAL' as const,
    action: 'HALT_CLUSTER' as const,
    reasons: (overrides.reasons as readonly string[] | undefined) ?? ['b', 'a'],
    invariantIds: (overrides.invariantIds as readonly string[] | undefined) ?? ['i2', 'i1'],
    violationCount: 0,
    timestamp: 100,
    ...overrides,
  };
}

describe('16F.6.I antibug level2 distributed hardening', () => {
  it('MUST be invariant to deep object key ordering', () => {
    const d1 = decision({
      metadata: { a: 1, b: { x: 1, y: 2 } },
    });
    const d2 = decision({
      metadata: { b: { y: 2, x: 1 }, a: 1 },
    });
    const r1 = executeComplianceDecision(baseCluster(), d1);
    const r2 = executeComplianceDecision(baseCluster(), d2);
    expect(r1).toEqual(r2);
  });

  it('MUST behave identically across slightly diverged cluster states', () => {
    const base = baseCluster();
    const clusterA = base;
    const clusterB = {
      ...base,
      nodes: [...base.nodes, { id: 'n3', state: { status: 'OK' } }],
    };
    const d = decision();
    const r1 = executeComplianceDecision(clusterA, d);
    const r2 = executeComplianceDecision(clusterB, d);
    expect(r1.actions).toEqual(r2.actions);
  });

  it('MUST NOT mutate deeply nested structures', () => {
    const frozen = deepClone(baseCluster());
    Object.freeze(frozen.nodes[0]!.state);
    const d = decision();
    const result = executeComplianceDecision(frozen, d);
    expect(result.mutatedCluster.nodes[0]!.state).toEqual(frozen.nodes[0]!.state);
  });

  it('MUST handle pre-populated execution journal deterministically', () => {
    const cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    const mutated = {
      ...r1.mutatedCluster,
      executionJournal: {
        ...(r1.mutatedCluster.executionJournal ?? {}),
        EXTRA_FAKE_ENTRY: {
          decisionId: 'fake',
          timestamp: 0,
          actions: [],
          applied: false,
        },
      },
    };
    const r2 = executeComplianceDecision(mutated, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST treat semantically identical decisions as identical', () => {
    const d1 = decision({
      reasons: ['a', 'b'],
      invariantIds: ['x', 'y'],
    });
    const d2 = decision({
      reasons: ['b', 'a'],
      invariantIds: ['y', 'x'],
    });
    const r1 = executeComplianceDecision(baseCluster(), d1);
    const r2 = executeComplianceDecision(baseCluster(), d2);
    expect(r1.mutatedCluster).toEqual(r2.mutatedCluster);
  });

  it('MUST keep journal stable under repeated execution attempts', () => {
    let cluster = baseCluster();
    const d = decision();
    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = executeComplianceDecision(cluster, d);
      cluster = r.mutatedCluster;
      results.push(Object.keys(cluster.executionJournal ?? {}).length);
    }
    expect(results.every((v) => v === 1)).toBe(true);
  });

  it('MUST survive adversarial permutations of input arrays', () => {
    const permutations = [
      ['x', 'a', 'z', 'b'],
      ['b', 'z', 'a', 'x'],
      ['z', 'b', 'x', 'a'],
    ];
    const results = permutations.map((p) =>
      executeComplianceDecision(
        baseCluster(),
        decision({
          reasons: p,
          invariantIds: [...p],
        }),
      ),
    );
    expect(results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]))).toBe(true);
  });

  it('MUST not leak mutations through nested references', () => {
    const cluster = baseCluster();
    const d = decision();
    const r = executeComplianceDecision(cluster, d);
    expect(r.mutatedCluster.transitionLocks).not.toBe(cluster.transitionLocks);
  });

  it('simulate MUST remain consistent even after prior executions', () => {
    const cluster = baseCluster();
    const d = decision();
    const r = executeComplianceDecision(cluster, d);
    const sim = executeComplianceDecision(r.mutatedCluster, d, { dryRun: true });
    const real = executeComplianceDecision(r.mutatedCluster, d);
    expect(sim.actions).toEqual(real.actions);
  });

  it('MUST remain deterministic as cluster size changes', () => {
    const d = decision();
    const small = baseCluster();
    const large = {
      ...baseCluster(),
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `n${i}`,
        state: { status: 'OK' },
      })),
    };
    const r1 = executeComplianceDecision(small, d);
    const r2 = executeComplianceDecision(large, d);
    expect(r1.actions).toEqual(r2.actions);
  });
});
