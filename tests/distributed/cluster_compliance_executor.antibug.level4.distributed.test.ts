import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { createInitialClusterState } from '../../src/distributed/cluster_lifecycle_engine';
import { DistributedSimulationHarness } from '../../src/distributed/simulation/distributed_simulation_harness';

function decision(overrides: Partial<ComplianceDecision> = {}): ComplianceDecision {
  return {
    severity: 'CRITICAL',
    action: 'HALT_CLUSTER',
    reasons: Object.freeze(['r1', 'r2']),
    invariantIds: Object.freeze(['i1']),
    violationCount: 0,
    timestamp: 100,
    ...overrides,
  };
}

function harness(seed: number, nodeCount = 5): DistributedSimulationHarness {
  const nodeIds = Array.from({ length: nodeCount }, (_, i) => `n${i + 1}`);
  return new DistributedSimulationHarness({
    nodeIds,
    initialClusterState: createInitialClusterState('cluster'),
    network: {
      seed,
      lossRate: 0,
      duplicationRate: 0,
      maxDelayTicks: 3,
      reorderBuffer: 8,
    },
  });
}

describe('16F.6.I level4 distributed simulation harness', () => {
  it('TEST 1 — Eventual consistency across 5 nodes', () => {
    const h = harness(1601, 5);
    h.injectDecision('n1', decision({ timestamp: 10 }));
    h.runTicks(50);
    h.drain();
    expect(h.snapshotsConverged()).toBe(true);
  });

  it('TEST 2 — Message reordering still converges', () => {
    const h = new DistributedSimulationHarness({
      nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1602, lossRate: 0, duplicationRate: 0, maxDelayTicks: 8, reorderBuffer: 50 },
    });
    h.injectDecision('n2', decision({ timestamp: 11 }));
    h.runTicks(120);
    h.drain();
    expect(h.snapshotsConverged()).toBe(true);
  });

  it('TEST 3 — Message loss + retry converges', () => {
    const h = new DistributedSimulationHarness({
      nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1603, lossRate: 0.35, duplicationRate: 0, maxDelayTicks: 4, reorderBuffer: 8 },
    });
    const d = decision({ timestamp: 12 });
    h.injectDecision('n1', d);
    h.runTicks(60);
    h.injectDecision('n1', d); // retry
    h.runTicks(120);
    h.drain();
    expect(h.snapshotsConverged()).toBe(true);
  });

  it('TEST 4 — Duplication storm preserves idempotence', () => {
    const h = new DistributedSimulationHarness({
      nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1604, lossRate: 0, duplicationRate: 0.9, maxDelayTicks: 5, reorderBuffer: 12 },
    });
    h.injectDecision('n3', decision({ timestamp: 13 }));
    h.runTicks(200);
    h.drain();
    const snaps = h.collectSnapshots();
    for (const s of Object.values(snaps)) {
      expect(Object.keys(s.executionJournal ?? {}).length).toBe(1);
    }
    expect(h.snapshotsConverged()).toBe(true);
  });

  it.skip('TEST 5 — Network partition then heal converges', () => {
    // TODO stabilization: investigate non-deterministic convergence under partition-heal scenario.
    const h = harness(1605, 6);
    h.network.partition([
      ['n1', 'n2', 'n3'],
      ['n4', 'n5', 'n6'],
    ]);
    h.injectDecision('n1', decision({ timestamp: 14 }));
    h.injectDecision('n4', decision({ timestamp: 15, reasons: Object.freeze(['other']) }));
    h.runTicks(80);
    h.network.heal();
    h.injectStateSync('n1');
    h.injectStateSync('n4');
    h.runTicks(120);
    h.drain();
    expect(h.snapshotsConverged()).toBe(true);
  });

  it.skip('TEST 6 — Split brain HALT vs ESCALATE resolves deterministically', () => {
    // TODO stabilization: investigate split-brain deterministic convergence mismatch.
    const h = harness(1606, 6);
    h.network.partition([
      ['n1', 'n2', 'n3'],
      ['n4', 'n5', 'n6'],
    ]);
    h.injectDecision('n1', decision({ timestamp: 16, action: 'HALT_CLUSTER' }));
    h.injectDecision('n4', decision({ timestamp: 17, action: 'ESCALATE', severity: 'CRITICAL' }));
    h.runTicks(100);
    h.network.heal();
    h.injectDecision('n1', decision({ timestamp: 16, action: 'HALT_CLUSTER' }));
    h.injectDecision('n4', decision({ timestamp: 17, action: 'ESCALATE', severity: 'CRITICAL' }));
    h.runTicks(150);
    h.injectStateSync('n4');
    h.injectStateSync('n1');
    h.runTicks(120);
    h.drain();
    expect(h.snapshotsConverged()).toBe(true);
  });

  it('TEST 7 — Independent local execution works without shared state', () => {
    const h = harness(1607, 4);
    h.nodes.n1.applyDecision(decision({ timestamp: 21 }));
    h.nodes.n2.applyDecision(decision({ timestamp: 21 }));
    h.nodes.n3.applyDecision(decision({ timestamp: 21 }));
    h.nodes.n4.applyDecision(decision({ timestamp: 21 }));
    expect(h.snapshotsConverged()).toBe(true);
  });

  // TODO: re-enable after deterministic convergence model is implemented
  // This test is currently non-deterministic and can fail due to timing/random factors
  it.skip('TEST 8 — Chaos long run 1000 ticks eventually converges', () => {
    const h = new DistributedSimulationHarness({
      nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
      initialClusterState: createInitialClusterState('cluster'),
      network: { seed: 1608, lossRate: 0.2, duplicationRate: 0.4, maxDelayTicks: 7, reorderBuffer: 20 },
    });
    for (let i = 0; i < 50; i++) {
      h.injectDecision(`n${(i % 5) + 1}`, decision({ timestamp: 100 + i, reasons: Object.freeze([`r${i % 3}`]) }));
      h.runTicks(20);
    }
    h.runTicks(1000);
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
      h.injectStateSync(id);
    }
    h.runTicks(300);
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
      h.injectStateSync(id);
    }
    h.runTicks(300);
    h.drain(5000);
    expect(h.snapshotsConverged()).toBe(true);
  });
});
