import { describe, expect, it } from 'vitest';

import { executeComplianceDecision } from '../../src/distributed/cluster_compliance_executor';

function delay(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // intentional busy wait for deterministic test-local delay simulation
  }
}

function createSeeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function baseCluster() {
  return {
    globalPhase: 'RUNNING',
    transitionLocks: { all: false },
    executionJournal: {},
    executionMetadata: {},
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`,
      state: { status: 'OK' },
    })),
  };
}

function decision(overrides: Record<string, unknown> = {}) {
  return {
    severity: 'CRITICAL' as const,
    action: 'HALT_CLUSTER' as const,
    reasons: ['a', 'b', 'c'],
    invariantIds: ['x', 'y', 'z'],
    violationCount: 0,
    timestamp: 100,
    ...overrides,
  };
}

describe('16F.6.I antibug level3 chaos/fault injection', () => {
  it('MUST remain deterministic under concurrent executions', () => {
    const cluster = baseCluster();
    const d = decision();
    const results = [];
    const run = () => {
      delay(1);
      results.push(executeComplianceDecision(cluster, d));
    };
    run();
    run();
    run();
    expect(results[0]!.actions).toEqual(results[1]!.actions);
    expect(results[1]!.actions).toEqual(results[2]!.actions);
  });

  it('MUST tolerate partial journal corruption', () => {
    const cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    const corrupted = { ...r1.mutatedCluster, executionJournal: null as never };
    const r2 = executeComplianceDecision(corrupted, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST survive node failure simulation', () => {
    const cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    const mutated = {
      ...r1.mutatedCluster,
      nodes: r1.mutatedCluster.nodes.slice(0, Math.max(0, r1.mutatedCluster.nodes.length - 1)),
    };
    const r2 = executeComplianceDecision(mutated, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST remain deterministic under timestamp skew', () => {
    const cluster = baseCluster();
    const d1 = decision();
    const d2 = decision({ timestamp: 999_999_999 });
    const r1 = executeComplianceDecision(cluster, d1);
    const r2 = executeComplianceDecision(cluster, d2);
    expect(r1.actions).toEqual(r2.actions);
  });

  it('MUST handle interleaved execution calls safely', () => {
    let cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    cluster = { ...r1.mutatedCluster, executionMetadata: { dirty: true } };
    const r2 = executeComplianceDecision(cluster, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST survive randomized fuzz executions', () => {
    const cluster = baseCluster();
    const d = decision();
    const rand = createSeeded(1606);
    const outputs = [];
    for (let i = 0; i < 20; i++) {
      const mutated = JSON.parse(JSON.stringify(cluster)) as ReturnType<typeof baseCluster>;
      if (rand() > 0.5) mutated.nodes.push({ id: `extra-${i}`, state: {} as { status?: string } });
      if (rand() > 0.5) mutated.executionMetadata = { x: i };
      outputs.push(executeComplianceDecision(mutated, d).actions);
    }
    expect(outputs.every((o) => JSON.stringify(o) === JSON.stringify(outputs[0]))).toBe(true);
  });

  it('MUST not break under journal overwrite race', () => {
    const cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    const mutated = {
      ...r1.mutatedCluster,
      executionJournal: {
        ...(r1.mutatedCluster.executionJournal ?? {}),
        fake: { decisionId: 'fake', timestamp: 0, actions: [], applied: false },
      },
    };
    const r2 = executeComplianceDecision(mutated, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST remain stable under repeated chaotic execution loops', () => {
    let cluster = baseCluster();
    const d = decision();
    const rand = createSeeded(1610);
    let last: ReturnType<typeof executeComplianceDecision> | undefined;
    for (let i = 0; i < 10; i++) {
      const working = JSON.parse(JSON.stringify(cluster)) as ReturnType<typeof baseCluster>;
      if (rand() > 0.3 && working.nodes.length > 0) working.nodes = working.nodes.slice(0, working.nodes.length - 1);
      if (rand() > 0.5) working.executionMetadata = { i };
      last = executeComplianceDecision(working, d);
      cluster = last.mutatedCluster as ReturnType<typeof baseCluster>;
    }
    expect(last?.actions).toBeDefined();
  });

  it('MUST resync correctly after corrupted intermediate state', () => {
    const cluster = baseCluster();
    const d = decision();
    const r1 = executeComplianceDecision(cluster, d);
    const corrupted = { ...r1.mutatedCluster, nodes: null as never };
    const r2 = executeComplianceDecision(corrupted, d);
    expect(r2.actions).toEqual(r1.actions);
  });

  it('MUST remain deterministic under full chaos scenario', () => {
    const cluster = baseCluster();
    const d = decision();
    const rand = createSeeded(9999);
    const runs = [];
    for (let i = 0; i < 30; i++) {
      const mutated = JSON.parse(JSON.stringify(cluster)) as ReturnType<typeof baseCluster>;
      if (rand() > 0.3 && mutated.nodes.length > 0) mutated.nodes.pop();
      if (rand() > 0.5) mutated.executionJournal = {};
      if (rand() > 0.7) mutated.executionMetadata = { i };
      runs.push(executeComplianceDecision(mutated, d).actions);
    }
    const baseline = runs[0];
    expect(runs.every((r) => JSON.stringify(r) === JSON.stringify(baseline))).toBe(true);
  });
});
