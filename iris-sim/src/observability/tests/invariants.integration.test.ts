import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { createTransportFailureNode, createRuntimeNode, injectPhaseFailure, startNode, stopNode } from './fixtures/runtime.factory.js';
import { observabilitySnapshotPath, readObservabilitySnapshot } from '../observability_persist.js';
import { validateObservabilitySnapshot } from '../observability_invariants.js';
import { normalizeSnapshot } from '../normalize_snapshot.js';

function isSorted(list: string[]): boolean {
  return list.every((v, i) => i === 0 || list[i - 1]! <= v);
}

describe('ADR-003.A integration invariants', () => {
  it('start -> snapshot file exists', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-int-a' });
    try {
      await startNode(node);
      const p = observabilitySnapshotPath(cwd);
      assert.ok(fs.existsSync(p));
    } finally {
      await stopNode(node);
    }
  });

  it('start -> RUNNING -> snapshot valid and deterministic runtime fields', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-int-b' });
    try {
      await startNode(node);
      const snap = node.getObservabilitySnapshot();
      const v = validateObservabilitySnapshot(snap);
      assert.strictEqual(v.ok, true, v.ok ? '' : v.errors.join('; '));
      assert.strictEqual(snap.runtime?.state, 'RUNNING');
      assert.ok(Array.isArray(snap.runtime?.activeComponentsList));
      assert.ok((snap.runtime?.activeComponentsList?.length ?? 0) > 0);
      assert.ok(isSorted(snap.runtime?.activeComponentsList ?? []));
      assert.strictEqual(snap.runtime?.lastInitPhaseStatus, 'OK');
      assert.ok((snap.runtime?.lastInitPhase ?? '').length > 0);
      assert.ok((snap.federation?.domainsRegistered ?? []).includes('local'));
      assert.ok(isSorted(snap.federation?.domainsRegistered ?? []));
    } finally {
      await stopNode(node);
    }
  });

  it('stop -> snapshot emitted -> STOPPED and empty activeComponentsList', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-int-c' });
    await startNode(node);
    await stopNode(node);
    const disk = readObservabilitySnapshot(cwd);
    assert.ok(disk);
    assert.strictEqual(disk!.runtime?.state, 'STOPPED');
    assert.deepStrictEqual(disk!.runtime?.activeComponentsList ?? [], []);
  });

  it('init failure captures phase trace (transport)', async () => {
    const { node } = createTransportFailureNode();
    await assert.rejects(() => startNode(node));
    const snap = node.getObservabilitySnapshot();
    assert.strictEqual(snap.runtime?.state, 'ERROR');
    assert.strictEqual(snap.runtime?.lastInitPhase, 'transport');
    assert.strictEqual(snap.runtime?.lastInitPhaseStatus, 'FAILED');
    assert.strictEqual(snap.runtime?.lastInitErrorPhase, 'transport');
    await stopNode(node);
  });

  it('LC-001 double stop is idempotent and keeps valid STOPPED snapshot', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-lc-double-stop' });
    await startNode(node);
    await stopNode(node);
    await stopNode(node);
    const disk = readObservabilitySnapshot(cwd);
    assert.ok(disk);
    assert.strictEqual(disk!.runtime?.state, 'STOPPED');
    assert.deepStrictEqual(disk!.runtime?.activeComponentsList ?? [], []);
    assert.strictEqual(validateObservabilitySnapshot(disk!).ok, true);
  });

  it('LC-002 stop without start does not crash and snapshot state remains valid', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-lc-stop-no-start' });
    await stopNode(node);
    const disk = readObservabilitySnapshot(cwd);
    if (disk == null) {
      assert.ok(true);
    } else {
      assert.strictEqual(disk.runtime?.state, 'STOPPED');
      assert.strictEqual(validateObservabilitySnapshot(disk).ok, true);
    }
  });

  it('LC-003 restart cycle resets state with no leakage', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-lc-restart' });
    await startNode(node);
    const first = normalizeSnapshot(node.getObservabilitySnapshot()) as any;
    await stopNode(node);
    await startNode(node);
    const second = normalizeSnapshot(node.getObservabilitySnapshot()) as any;
    assert.deepStrictEqual(first.runtime, second.runtime);
    assert.deepStrictEqual(first.federation, second.federation);
    await stopNode(node);
  });

  it('LC-004 failure then restart succeeds cleanly', async () => {
    const failing = createRuntimeNode({ nodeId: 'adr003-lc-fail-restart', transportType: 'invalid-transport-type' });
    await assert.rejects(() => startNode(failing.node));
    const failedSnap = failing.node.getObservabilitySnapshot();
    assert.strictEqual(failedSnap.runtime?.state, 'ERROR');
    await stopNode(failing.node);

    const healthy = createRuntimeNode({ nodeId: 'adr003-lc-fail-restart' });
    try {
      await startNode(healthy.node);
      const snap = healthy.node.getObservabilitySnapshot();
      assert.strictEqual(snap.runtime?.state, 'RUNNING');
      assert.strictEqual(snap.runtime?.lastInitPhaseStatus, 'OK');
    } finally {
      await stopNode(healthy.node);
    }
  });

  it('INIT-001 phase traces for transport/observability/sdk failures', async () => {
    const transport = createRuntimeNode({ nodeId: 'adr003-init-transport' });
    injectPhaseFailure(transport.node, 'transport');
    await assert.rejects(() => startNode(transport.node));
    const tSnap = transport.node.getObservabilitySnapshot();
    assert.strictEqual(tSnap.runtime?.lastInitErrorPhase, 'transport');
    assert.strictEqual(tSnap.runtime?.lastInitPhaseStatus, 'FAILED');
    await stopNode(transport.node);

    const observability = createRuntimeNode({ nodeId: 'adr003-init-observability' });
    injectPhaseFailure(observability.node, 'observability');
    await assert.rejects(() => startNode(observability.node));
    const oSnap = observability.node.getObservabilitySnapshot();
    assert.strictEqual(oSnap.runtime?.lastInitErrorPhase, 'observability');
    assert.strictEqual(oSnap.runtime?.lastInitPhaseStatus, 'FAILED');
    await stopNode(observability.node);

    const sdk = createRuntimeNode({ nodeId: 'adr003-init-sdk' });
    injectPhaseFailure(sdk.node, 'identity');
    await assert.rejects(() => startNode(sdk.node));
    const sSnap = sdk.node.getObservabilitySnapshot();
    assert.strictEqual(sSnap.runtime?.lastInitErrorPhase, 'identity');
    assert.strictEqual(sSnap.runtime?.lastInitPhaseStatus, 'FAILED');
    await stopNode(sdk.node);
  });

  it('INIT-002 failure overwrite keeps last attempted phase semantics', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-init-overwrite' });
    injectPhaseFailure(node, 'observability');
    await assert.rejects(() => startNode(node));
    const snap = node.getObservabilitySnapshot();
    assert.strictEqual(snap.runtime?.lastInitPhase, 'observability');
    assert.strictEqual(snap.runtime?.lastInitPhaseStatus, 'FAILED');
    assert.strictEqual(snap.runtime?.lastInitErrorPhase, 'observability');
    await stopNode(node);
  });

  it('INIT-003 successive failures update trace to latest run', async () => {
    const brokenA = createRuntimeNode({ nodeId: 'adr003-init-overwrite-2', transportType: 'invalid-transport-type' });
    await assert.rejects(() => startNode(brokenA.node));
    const first = brokenA.node.getObservabilitySnapshot();
    assert.strictEqual(first.runtime?.lastInitErrorPhase, 'transport');
    await stopNode(brokenA.node);

    const brokenB = createRuntimeNode({ nodeId: 'adr003-init-overwrite-2' });
    injectPhaseFailure(brokenB.node, 'observability');
    await assert.rejects(() => startNode(brokenB.node));
    const second = brokenB.node.getObservabilitySnapshot();
    assert.strictEqual(second.runtime?.lastInitErrorPhase, 'observability');
    assert.strictEqual(second.runtime?.lastInitPhaseStatus, 'FAILED');
    await stopNode(brokenB.node);
  });

  it('STOP-001 stop after error still emits STOPPED snapshot', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-stop-after-error', transportType: 'invalid-transport-type' });
    await assert.rejects(() => startNode(node));
    await stopNode(node);
    const snap = readObservabilitySnapshot(cwd);
    assert.ok(snap);
    assert.strictEqual(snap!.runtime?.state, 'STOPPED');
  });

  it('STOP-002 activeComponentsList always empty after stop', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-stop-components' });
    await startNode(node);
    await stopNode(node);
    const snap = readObservabilitySnapshot(cwd);
    assert.ok(snap);
    assert.deepStrictEqual(snap!.runtime?.activeComponentsList ?? [], []);
  });

  it('federation edge: normalization sorts domainsRegistered', async () => {
    const { node } = createRuntimeNode({ nodeId: 'adr003-fed-order' });
    await startNode(node);
    const snap = node.getObservabilitySnapshot();
    snap.federation = {
      domainId: 'local',
      peersByDomain: {},
      rejectedByPolicy: 0,
      domainsRegistered: ['z', 'local', 'a'],
    };
    const normalized = normalizeSnapshot(snap) as any;
    assert.deepStrictEqual(normalized.federation.domainsRegistered, ['a', 'local', 'z']);
    await stopNode(node);
  });

  it('federation edge: empty/duplicate/invalid domains are rejected by invariants', () => {
    const base = {
      node: { id: 'x', timestamp: 1, uptime_seconds: 0 },
      metrics: { nodeId: 'x', timestamp: 't', metrics: { 'runtime.state': 1 } },
      runtime: { state: 'RUNNING', updatedAt: 't', errors: 0, activeComponents: 0 },
      federation: { domainId: 'local', peersByDomain: {}, rejectedByPolicy: 0, domainsRegistered: [] as any[] },
    } as any;
    const empty = { ...base, federation: { ...base.federation, domainsRegistered: [] } };
    assert.strictEqual(validateObservabilitySnapshot(empty as any).ok, true);
    const dup = { ...base, federation: { ...base.federation, domainsRegistered: ['local', 'local'] } };
    const dupV = validateObservabilitySnapshot(dup as any);
    assert.strictEqual(dupV.ok, false);
    const unsorted = { ...base, federation: { ...base.federation, domainsRegistered: ['z', 'a'] } };
    const unsortedV = validateObservabilitySnapshot(unsorted as any);
    assert.strictEqual(unsortedV.ok, false);
    const invalid = { ...base, federation: { ...base.federation, domainsRegistered: ['local', ''] } };
    const invalidV = validateObservabilitySnapshot(invalid as any);
    assert.strictEqual(invalidV.ok, false);
  });
});

