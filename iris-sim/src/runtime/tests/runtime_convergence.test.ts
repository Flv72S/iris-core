import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IrisNode } from '../../sdk/index.js';
import { normalizeSnapshot } from '../../observability/normalize_snapshot.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Runtime Convergence (16F.X8)', () => {
  it('bootstraps canonical runtime and converges CRDT across nodes', async () => {
    const cwdA = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-x8-a-'));
    const cwdB = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-x8-b-'));
    const a = new IrisNode({
      observability: { cwd: cwdA },
      transport: { type: 'ws', options: { port: 43101, host: '127.0.0.1' } },
      runtime: {
        allowLegacy: false,
        transport: { secure: true },
        gossip: { enabled: true },
        crdt: { enabled: true },
        federation: { enabled: true },
      },
    });
    const b = new IrisNode({
      observability: { cwd: cwdB },
      transport: { type: 'ws', options: { port: 43102, host: '127.0.0.1' } },
      runtime: {
        allowLegacy: false,
        transport: { secure: true },
        gossip: { enabled: true },
        crdt: { enabled: true },
        federation: { enabled: true },
      },
    });

    try {
      await a.start();
      await b.start();
      assert.strictEqual(a.getRuntimeState(), 'RUNNING');
      assert.strictEqual(b.getRuntimeState(), 'RUNNING');

      await a.connectRuntimePeer((b.getStatus() as any).node_id);
      await b.connectRuntimePeer((a.getStatus() as any).node_id);

      a.applyCRDTOperation('SET', { owner: 'a', value: 42 });
      await wait(120);

      const snapA = a.getRuntimeCRDTSnapshot();
      const snapB = b.getRuntimeCRDTSnapshot();
      assert.deepStrictEqual(snapA, snapB);

      const obsA = a.getObservabilitySnapshot();
      assert.ok(obsA.transport);
      assert.ok(obsA.gossip);
      assert.ok(obsA.crdt);
      assert.ok((obsA.metrics.metrics['runtime.active_components'] ?? 0) >= 6);
      assert.deepStrictEqual([...(obsA.runtime?.activeComponentsList ?? [])].sort(), obsA.runtime?.activeComponentsList ?? []);
      assert.ok((obsA.federation?.domainsRegistered ?? []).includes('local'));
      assert.strictEqual(obsA.runtime?.lastInitPhaseStatus, 'OK');
    } finally {
      await a.stop();
      await b.stop();
      assert.strictEqual(a.getRuntimeState(), 'STOPPED');
      assert.strictEqual(b.getRuntimeState(), 'STOPPED');
    }
  });

  it('deterministic boot state across multiple starts', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-x81-det-'));
    const a = new IrisNode({
      observability: { cwd },
      transport: { type: 'ws', options: { port: 43111, host: '127.0.0.1' } },
      runtime: { allowLegacy: false, transport: { secure: true }, gossip: { enabled: true }, crdt: { enabled: true }, federation: { enabled: true } },
    });
    try {
      await a.start();
      const first = normalizeSnapshot(a.getObservabilitySnapshot());
      await a.stop();
      await a.start();
      const second = normalizeSnapshot(a.getObservabilitySnapshot());
      assert.deepStrictEqual(first, second);
    } finally {
      await a.stop();
    }
  });

  it('failure isolation: invalid phase configs fail fast with runtime error state', async () => {
    const n = new IrisNode({
      transport: { type: 'ws', options: { port: 43121, host: '127.0.0.1' } },
      runtime: { allowLegacy: false, transport: { secure: false }, gossip: { enabled: true }, crdt: { enabled: true }, federation: { enabled: true } },
    });
    await assert.rejects(() => n.start());
    assert.strictEqual(n.getRuntimeState(), 'ERROR');
    const snap = n.getObservabilitySnapshot();
    assert.strictEqual(snap.runtime?.lastInitPhaseStatus, 'FAILED');
    assert.ok((snap.runtime?.lastInitErrorPhase ?? '').length > 0);
    await n.stop();
  });
});

