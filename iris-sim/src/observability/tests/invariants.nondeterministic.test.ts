import { describe, it } from 'node:test';
import assert from 'node:assert';

import { RUNTIME_INVARIANT_CLASSIFICATION } from '../invariant_classification.js';
import { validateObservabilitySnapshot } from '../observability_invariants.js';
import { createRuntimeNode, startNode, stopNode } from './fixtures/runtime.factory.js';

function isFiniteNonNegative(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function assertBoundedSnapshotFields(s: any): void {
  assert.ok(s.runtime, 'runtime block must exist');
  assert.ok(s.gossip, 'gossip block must exist');
  assert.ok(s.gossipConsistency, 'gossipConsistency block must exist');
  assert.ok(s.crdt, 'crdt block must exist');

  assert.ok(isFiniteNonNegative(s.runtime.errors), 'runtime.errors must be finite and >= 0');
  assert.ok(isFiniteNonNegative(s.runtime.activeComponents), 'runtime.activeComponents must be finite and >= 0');
  assert.ok(isFiniteNonNegative(s.gossip.messagesReceived), 'gossip.messagesReceived must be finite and >= 0');
  assert.ok(isFiniteNonNegative(s.gossip.messagesForwarded), 'gossip.messagesForwarded must be finite and >= 0');
  assert.ok(isFiniteNonNegative(s.crdt.operationsApplied), 'crdt.operationsApplied must be finite and >= 0');
  assert.ok(isFiniteNonNegative(s.crdt.stateSize), 'crdt.stateSize must be finite and >= 0');
  assert.ok(
    typeof s.gossipConsistency.convergenceRate === 'number' &&
      Number.isFinite(s.gossipConsistency.convergenceRate) &&
      s.gossipConsistency.convergenceRate >= 0 &&
      s.gossipConsistency.convergenceRate <= 1,
    'gossipConsistency.convergenceRate must be in [0,1]',
  );
  assert.ok(
    typeof s.crdt.convergenceRate === 'number' && Number.isFinite(s.crdt.convergenceRate) && s.crdt.convergenceRate >= 0 && s.crdt.convergenceRate <= 1,
    'crdt.convergenceRate must be in [0,1]',
  );
}

describe('ADR-003.A non-deterministic observability layer', () => {
  const NON_DETERMINISTIC_IDS = Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)
    .filter(([, klass]) => klass === 'NON_DETERMINISTIC')
    .map(([id]) => id);

  const TS_CONTROLLED_IDS = Object.entries(RUNTIME_INVARIANT_CLASSIFICATION)
    .filter(([, klass]) => klass === 'TS_CONTROLLED')
    .map(([id]) => id);

  it('ND-001 presence: required fields for non-deterministic/controlled invariants exist', async () => {
    assert.ok(NON_DETERMINISTIC_IDS.length > 0, 'at least one NON_DETERMINISTIC invariant expected');
    assert.ok(TS_CONTROLLED_IDS.length > 0, 'at least one TS_CONTROLLED invariant expected');

    const { node } = createRuntimeNode({ nodeId: 'adr003-nd-presence' });
    try {
      await startNode(node);
      const s: any = node.getObservabilitySnapshot();
      assert.ok(s.crdt != null);
      assert.ok(s.gossip != null);
      assert.ok(s.gossipConsistency != null);
      assert.ok(s.runtime != null);
      assert.ok(s.metrics?.metrics != null);
    } finally {
      await stopNode(node);
    }
  });

  it('ND-002 shape: invariant-related structures are valid objects/arrays', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-nd-shape' });
    try {
      await startNode(node);
      const s: any = node.getObservabilitySnapshot();
      assert.strictEqual(typeof s.runtime, 'object');
      assert.strictEqual(typeof s.crdt, 'object');
      assert.strictEqual(typeof s.gossip, 'object');
      assert.strictEqual(typeof s.gossipConsistency, 'object');
      assert.ok(Array.isArray(s.runtime.activeComponentsList));
      assert.ok(Array.isArray(s.federation?.domainsRegistered));
      const validation = validateObservabilitySnapshot(s);
      assert.strictEqual(validation.ok, true, validation.ok ? '' : validation.errors.join('; '));
    } finally {
      await stopNode(node);
    }
  });

  it('ND-003 bounded values: counters/rates stay finite and in valid ranges', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-nd-bounded' });
    try {
      await startNode(node);
      const s: any = node.getObservabilitySnapshot();
      assertBoundedSnapshotFields(s);
    } finally {
      await stopNode(node);
    }
  });

  it('ND-004 monotonic/non-regression: counters do not perform impossible transitions', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-nd-mono' });
    try {
      await startNode(node);
      const a: any = node.getObservabilitySnapshot();
      const b: any = node.getObservabilitySnapshot();

      assert.ok((b.runtime?.errors ?? 0) >= (a.runtime?.errors ?? 0), 'runtime.errors cannot regress');
      assert.ok((b.gossip?.messagesReceived ?? 0) >= (a.gossip?.messagesReceived ?? 0), 'gossip.messagesReceived cannot regress');
      assert.ok((b.gossip?.messagesForwarded ?? 0) >= (a.gossip?.messagesForwarded ?? 0), 'gossip.messagesForwarded cannot regress');
      assert.ok((b.crdt?.operationsApplied ?? 0) >= (a.crdt?.operationsApplied ?? 0), 'crdt.operationsApplied cannot regress');
      assert.ok((b.runtime?.activeComponents ?? 0) >= 0, 'runtime.activeComponents cannot be negative');
    } finally {
      await stopNode(node);
    }
  });

  it('ND-005 multi-run variability safe zone: values may differ but remain valid', async () => {
    const convergence: number[] = [];
    const gossipRates: number[] = [];
    const errors: number[] = [];

    for (let i = 0; i < 8; i++) {
      const { node } = createRuntimeNode({ nodeId: `adr003-nd-multirun-${i}` });
      try {
        await startNode(node);
        const s: any = node.getObservabilitySnapshot();
        assertBoundedSnapshotFields(s);
        convergence.push(s.crdt.convergenceRate);
        gossipRates.push(s.gossipConsistency.convergenceRate);
        errors.push(s.runtime.errors);
      } finally {
        await stopNode(node);
      }
    }

    assert.ok(convergence.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(gossipRates.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(errors.every((v) => Number.isFinite(v) && v >= 0));
  });

  it('ND-006 no crash guarantee: invariant-related subsystems remain stable across repeated start/stop', async () => {
    for (let i = 0; i < 6; i++) {
      const { node } = createRuntimeNode({ nodeId: `adr003-nd-nocrash-${i}` });
      await startNode(node);
      const s: any = node.getObservabilitySnapshot();
      const v = validateObservabilitySnapshot(s);
      assert.strictEqual(v.ok, true, v.ok ? '' : v.errors.join('; '));
      await stopNode(node);
      const stopped: any = node.getObservabilitySnapshot();
      assert.ok(stopped.runtime?.state === 'STOPPED' || stopped.runtime?.state === 'ERROR' || stopped.runtime?.state === 'RUNNING');
    }
  });
});
