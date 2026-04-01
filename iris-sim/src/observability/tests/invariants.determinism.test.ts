import { describe, it } from 'node:test';
import assert from 'node:assert';

import { normalizeSnapshot } from '../normalize_snapshot.js';
import { isDeterministicSnapshot, sanitizeSnapshotForJson } from '../observability_persist.js';
import { createRuntimeNode, startNode, stopNode } from './fixtures/runtime.factory.js';
import { cloneSnapshot, createValidSnapshot } from './fixtures/snapshot.factory.js';

function keysAreSorted(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  for (let i = 1; i < keys.length; i++) {
    if (keys[i - 1]! > keys[i]!) return false;
  }
  return true;
}

describe('ADR-003.A determinism guarantees', () => {
  it('TEST1 snapshot equality after normalization on identical runs', async () => {
    const run1 = createRuntimeNode({ nodeId: 'adr003-det-node', runtime: { allowLegacy: false } });
    const run2 = createRuntimeNode({ nodeId: 'adr003-det-node', runtime: { allowLegacy: false } });
    try {
      await startNode(run1.node);
      const s1 = normalizeSnapshot(run1.node.getObservabilitySnapshot());
      await stopNode(run1.node);

      await startNode(run2.node);
      const s2 = normalizeSnapshot(run2.node.getObservabilitySnapshot());
      assert.deepStrictEqual(s1, s2);
    } finally {
      await stopNode(run1.node);
      await stopNode(run2.node);
    }
  });

  it('TEST2 stable serialization reports deterministic snapshot', () => {
    const snap = createRuntimeNode({ nodeId: 'adr003-det-ser' }).node.getObservabilitySnapshot();
    assert.strictEqual(isDeterministicSnapshot(snap), true);
  });

  it('TEST3 ordering guarantees for lists and metric keys', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-det-order' });
    try {
      await startNode(node);
      const snap = node.getObservabilitySnapshot();
      const json = sanitizeSnapshotForJson(snap);
      const metrics = (json.metrics as any).metrics as Record<string, unknown>;
      assert.ok(keysAreSorted(metrics));
      assert.deepStrictEqual(
        [...(snap.runtime?.activeComponentsList ?? [])].sort(),
        snap.runtime?.activeComponentsList ?? [],
      );
      assert.deepStrictEqual(
        [...(snap.federation?.domainsRegistered ?? [])].sort(),
        snap.federation?.domainsRegistered ?? [],
      );
    } finally {
      await stopNode(node);
    }
  });

  it('TEST4 volatile fields removed by normalizeSnapshot', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-det-volatile' });
    try {
      await startNode(node);
      const out = normalizeSnapshot(node.getObservabilitySnapshot()) as any;
      assert.ok(out.metrics);
      assert.ok(out.metrics.metrics);
      assert.strictEqual('timestamp' in out.metrics, false);
      assert.strictEqual('node' in out, false);
      assert.strictEqual('runtime.boot.time' in out.metrics.metrics, false);
      assert.strictEqual('runtime.init.phase.duration' in out.metrics.metrics, false);
      assert.strictEqual('node_uptime_seconds' in out.metrics.metrics, false);
    } finally {
      await stopNode(node);
    }
  });

  it('IDP-001 normalize idempotence and non-mutation side-effects', () => {
    const snap = createValidSnapshot({
      metrics: {
        metrics: {
          node_uptime_seconds: 500,
          'runtime.boot.time': 1234,
        },
      },
    });
    const before = cloneSnapshot(snap);
    const once = normalizeSnapshot(snap);
    const twice = normalizeSnapshot(once as any);
    assert.deepStrictEqual(once, twice);
    assert.deepStrictEqual(snap, before);
  });

  it('DET-002 multi-run consistency over 10 identical runs', async () => {
    const snapshots: Record<string, unknown>[] = [];
    for (let i = 0; i < 10; i++) {
      const { node } = createRuntimeNode({ nodeId: 'adr003-det-multi' });
      try {
        await startNode(node);
        snapshots.push(normalizeSnapshot(node.getObservabilitySnapshot()));
      } finally {
        await stopNode(node);
      }
    }
    const baseline = snapshots[0]!;
    for (let i = 1; i < snapshots.length; i++) {
      assert.deepStrictEqual(snapshots[i], baseline);
    }
  });

  it('DET-003 order stability under permutation', () => {
    const a = createValidSnapshot();
    const b = createValidSnapshot();
    b.runtime!.activeComponentsList = [...(b.runtime!.activeComponentsList ?? [])].reverse();
    b.federation!.domainsRegistered = ['zeta', 'alpha', 'local'];
    b.metrics.metrics = {
      messages_sent: 2,
      'runtime.component.count': 6,
      'runtime.state': 1,
      'runtime.errors': 0,
      'runtime.active_components': 6,
    };
    const na = normalizeSnapshot(a);
    const nb = normalizeSnapshot(b);
    assert.deepStrictEqual(na.runtime, nb.runtime);
    assert.deepStrictEqual((nb as any).federation.domainsRegistered, ['alpha', 'local', 'zeta']);
    assert.deepStrictEqual(Object.keys((nb as any).metrics.metrics), Object.keys((na as any).metrics.metrics));
  });

  it('IMM-001 normalize does not mutate original snapshot', () => {
    const snap = createValidSnapshot();
    const before = cloneSnapshot(snap);
    void normalizeSnapshot(snap);
    assert.deepStrictEqual(snap, before);
  });

  it('DET-005 normalized output is stable across repeated calls', () => {
    const snap = createValidSnapshot();
    const outs = Array.from({ length: 5 }, () => normalizeSnapshot(snap));
    for (let i = 1; i < outs.length; i++) {
      assert.deepStrictEqual(outs[i], outs[0]);
    }
  });
});

