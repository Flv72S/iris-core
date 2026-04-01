/**
 * Microstep 16D — Control plane unit + HTTP integration tests.
 */

import { after, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IrisObservabilitySnapshot } from '../../observability/observability_contract.js';
import { signPayload } from '../../security/hmac.js';
import { generateNonce } from '../../security/nonce.js';
import { buildSignedPayloadString } from '../control_plane_ingest_auth.js';
import {
  ControlPlane,
  DEFAULT_MAX_INGEST_BYTES,
} from '../control_plane.js';
import { registerCleanup, runGlobalCleanups } from '../../test/utils/cleanup.js';
import {
  IRIS_HEADER_NODE_ID,
  IRIS_HEADER_NONCE,
  IRIS_HEADER_SIGNATURE,
  IRIS_HEADER_TIMESTAMP,
} from '../../security/security_types.js';
import { listenControlPlaneHttpServer } from '../transport/http_server.js';
import { controlPlaneSnapshotPath } from '../control_plane_persist.js';

const TEST_SECRET = '01234567890123456789012345678901';
const TEST_NEXT_SECRET = 'abcdefghijklmnopqrstuvwxyzABCDEF';

function minimalSnapshot(nodeId: string, ts: number): IrisObservabilitySnapshot {
  return {
    node: { id: nodeId, timestamp: ts, uptime_seconds: 0 },
    metrics: {
      metrics: { messages_sent: 0 } as Record<string, number>,
      timestamp: new Date(ts).toISOString(),
      nodeId,
    },
  };
}

async function postSignedIngest(base: string, nodeId: string, secret: string, ts: number): Promise<Response> {
  const bodyObj = { nodeId, snapshot: minimalSnapshot(nodeId, ts) };
  const nonce = generateNonce();
  const payload = buildSignedPayloadString({
    nodeId,
    timestamp: ts,
    nonce,
    body: bodyObj,
  });
  const sig = signPayload(secret, payload);
  return fetch(`${base}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [IRIS_HEADER_NODE_ID]: nodeId,
      [IRIS_HEADER_TIMESTAMP]: String(ts),
      [IRIS_HEADER_NONCE]: nonce,
      [IRIS_HEADER_SIGNATURE]: sig,
    },
    body: JSON.stringify(bodyObj),
  });
}

describe('Control plane (16D)', () => {
  const controlPlanes = new Set<ControlPlane>();
  const trackControlPlane = (cp: ControlPlane): ControlPlane => {
    controlPlanes.add(cp);
    registerCleanup(async () => {
      await cp.shutdown();
    });
    return cp;
  };

  after(async () => {
    for (const cp of controlPlanes) {
      await cp.shutdown();
    }
    controlPlanes.clear();
    await runGlobalCleanups();
  });

  it('node registration: ingest snapshot registers node', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    const r = cp.ingestSnapshot('node-a', minimalSnapshot('node-a', t));
    assert.strictEqual(r.ok, true);
    assert.ok(cp.registry.has('node-a'));
    assert.strictEqual(cp.getClusterSnapshot().cluster.nodeCount, 1);
  });

  it('heartbeat: lastSeen updates on repeated ingest', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.ingestSnapshot('n1', minimalSnapshot('n1', t));
    const seen1 = cp.registry.getNode('n1', t)!.lastSeen;
    t += 5000;
    cp.ingestSnapshot('n1', minimalSnapshot('n1', t));
    const seen2 = cp.registry.getNode('n1', t)!.lastSeen;
    assert.ok(seen2 > seen1);
  });

  it('status transition: online → stale → offline (clock)', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.ingestSnapshot('n1', minimalSnapshot('n1', t));
    assert.strictEqual(cp.registry.getNode('n1', t)!.status, 'online');

    t += 11_000;
    assert.strictEqual(cp.registry.getNode('n1', t)!.status, 'stale');

    t += 60_000;
    assert.strictEqual(cp.registry.getNode('n1', t)!.status, 'offline');
  });

  it('multi-node: three nodes → cluster counts', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.ingestSnapshot('a', minimalSnapshot('a', t));
    cp.ingestSnapshot('b', minimalSnapshot('b', t));
    cp.ingestSnapshot('c', minimalSnapshot('c', t));
    const snap = cp.getClusterSnapshot();
    assert.strictEqual(snap.cluster.nodeCount, 3);
    assert.strictEqual(snap.cluster.healthyNodes, 3);
    assert.strictEqual(snap.cluster.degradedNodes, 0);
    assert.strictEqual(Object.keys(snap.nodes).length, 3);
  });

  it('invalid snapshot: rejected without throwing', () => {
    const cp = trackControlPlane(new ControlPlane({ persist: false }));
    const bad = {
      node: { id: 'x', timestamp: NaN, uptime_seconds: 0 },
      metrics: { metrics: {}, timestamp: '', nodeId: 'y' },
    } as IrisObservabilitySnapshot;
    const r = cp.ingestSnapshot('n1', bad);
    assert.strictEqual(r.ok, false);
  });

  it('HTTP ingest: POST updates control plane state', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cp-http-'));
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ cwd: tmp, now: () => t, persist: true }));
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const body = { nodeId: 'http-n', snapshot: minimalSnapshot('http-n', t) };
      const res = await fetch(`${base}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.strictEqual(res.ok, true);
      const cluster = await fetch(`${base}/cluster`).then((r) => r.json() as Promise<{ nodeCount: number }>);
      assert.strictEqual(cluster.nodeCount, 1);
      assert.ok(fs.existsSync(controlPlaneSnapshotPath(tmp)));
    } finally {
      await cp.shutdown();
    }
  });

  it('node disconnect: markOffline forces offline status', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.ingestSnapshot('z', minimalSnapshot('z', t));
    assert.strictEqual(cp.registry.getNode('z', t)!.status, 'online');
    cp.markOffline('z');
    assert.strictEqual(cp.registry.getNode('z', t)!.status, 'offline');
  });

  it('rejects older snapshot timestamp (monotonic per node)', () => {
    const t2 = 1_700_000_000_000;
    const t1 = t2 - 10_000;
    const cp = trackControlPlane(new ControlPlane({ persist: false }));
    assert.strictEqual(cp.ingestSnapshot('n', minimalSnapshot('n', t2)).ok, true);
    const r = cp.ingestSnapshot('n', minimalSnapshot('n', t1));
    assert.strictEqual(r.ok, false);
  });

  it('lifecycle: PENDING -> ACTIVE', () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.registry.registerNodeWithSecret('n-lf', TEST_SECRET, t);
    const info0 = cp.registry.getNode('n-lf', t)!;
    assert.strictEqual(info0.trustState, 'PENDING');
    const ok = cp.activateNode('n-lf');
    assert.strictEqual(ok, true);
    const info1 = cp.registry.getNode('n-lf', t)!;
    assert.strictEqual(info1.trustState, 'ACTIVE');
  });

  it('reject pending: signed ingest -> 401', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('pending-n', TEST_SECRET, t);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const res = await postSignedIngest(base, 'pending-n', TEST_SECRET, t);
      assert.strictEqual(res.status, 401);
    } finally {
      await cp.shutdown();
    }
  });

  it('rotation: signature with active and next are both accepted while ROTATING', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('rot-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('rot-n'), true);
    assert.strictEqual(cp.registry.startRotation('rot-n', TEST_NEXT_SECRET, t + 1), true);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const oldRes = await postSignedIngest(base, 'rot-n', TEST_SECRET, t + 2);
      assert.strictEqual(oldRes.status, 200);
      const nextRes = await postSignedIngest(base, 'rot-n', TEST_NEXT_SECRET, t + 3);
      assert.strictEqual(nextRes.status, 200);
    } finally {
      await cp.shutdown();
    }
  });

  it('finalize: old fails, new succeeds', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('fin-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('fin-n'), true);
    assert.strictEqual(cp.registry.startRotation('fin-n', TEST_NEXT_SECRET, t + 1), true);
    assert.strictEqual(cp.finalizeRotation('fin-n'), true);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const oldRes = await postSignedIngest(base, 'fin-n', TEST_SECRET, t + 2);
      assert.strictEqual(oldRes.status, 401);
      const nextRes = await postSignedIngest(base, 'fin-n', TEST_NEXT_SECRET, t + 3);
      assert.strictEqual(nextRes.status, 200);
    } finally {
      await cp.shutdown();
    }
  });

  it('revocation: ingest always 401 after revoke', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('rev-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('rev-n'), true);
    assert.strictEqual(cp.revokeNode('rev-n'), true);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const res = await postSignedIngest(base, 'rev-n', TEST_SECRET, t + 1);
      assert.strictEqual(res.status, 401);
    } finally {
      await cp.shutdown();
    }
  });

  it('replay after rotation: nonce reused is rejected', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('rep-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('rep-n'), true);
    assert.strictEqual(cp.registry.startRotation('rep-n', TEST_NEXT_SECRET, t + 1), true);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const nodeId = 'rep-n';
      const ts = t + 2;
      const nonce = 'fixed-nonce';
      const bodyObj = { nodeId, snapshot: minimalSnapshot(nodeId, ts) };
      const payload = buildSignedPayloadString({ nodeId, timestamp: ts, nonce, body: bodyObj });
      const sig = signPayload(TEST_NEXT_SECRET, payload);
      const headers = {
        'Content-Type': 'application/json',
        [IRIS_HEADER_NODE_ID]: nodeId,
        [IRIS_HEADER_TIMESTAMP]: String(ts),
        [IRIS_HEADER_NONCE]: nonce,
        [IRIS_HEADER_SIGNATURE]: sig,
      };
      const first = await fetch(`${base}/ingest`, { method: 'POST', headers, body: JSON.stringify(bodyObj) });
      const second = await fetch(`${base}/ingest`, { method: 'POST', headers, body: JSON.stringify(bodyObj) });
      assert.strictEqual(first.status, 200);
      assert.strictEqual(second.status, 401);
    } finally {
      await cp.shutdown();
    }
  });

  it('HTTP ingest: payload too large returns 413', async () => {
    const cp = trackControlPlane(new ControlPlane({ persist: false }));
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const tooBig = 'x'.repeat(DEFAULT_MAX_INGEST_BYTES + 10);
      const res = await fetch(`${base}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tooBig,
      });
      assert.strictEqual(res.status, 413);
    } finally {
      await cp.shutdown();
    }
  });

  it('HTTP signed ingest: node without secret is rejected (401)', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    // intentionally not registering secret
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const bodyObj = { nodeId: 'missing-secret', snapshot: minimalSnapshot('missing-secret', t) };
      const ts = t;
      const nonce = generateNonce();
      const payload = buildSignedPayloadString({
        nodeId: 'missing-secret',
        timestamp: ts,
        nonce,
        body: bodyObj,
      });
      const sig = signPayload(TEST_SECRET, payload);
      const res = await fetch(`${base}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [IRIS_HEADER_NODE_ID]: 'missing-secret',
          [IRIS_HEADER_TIMESTAMP]: String(ts),
          [IRIS_HEADER_NONCE]: nonce,
          [IRIS_HEADER_SIGNATURE]: sig,
        },
        body: JSON.stringify(bodyObj),
      });
      assert.strictEqual(res.status, 401);
    } finally {
      await cp.shutdown();
    }
  });

  it('HTTP ingest: custom payload limit is respected', async () => {
    const cp = trackControlPlane(new ControlPlane({ persist: false, maxIngestBytes: 128 }));
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const tooBig = 'x'.repeat(512);
      const res = await fetch(`${base}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tooBig,
      });
      assert.strictEqual(res.status, 413);
    } finally {
      await cp.shutdown();
    }
  });

  it('ControlPlane securityLogSink injection receives security events', async () => {
    const events: string[] = [];
    const cp = trackControlPlane(new ControlPlane({
      persist: false,
      maxIngestBytes: 64,
      securityLogSink: {
        log(event: string): void {
          events.push(event);
        },
      },
    }));
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const tooBig = 'x'.repeat(1024);
      const res = await fetch(`${base}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tooBig,
      });
      assert.strictEqual(res.status, 413);
      assert.ok(events.includes('PAYLOAD_TOO_LARGE'));
    } finally {
      await cp.shutdown();
    }
  });

  it('HTTP lifecycle endpoints: activate/revoke/rotate/rotation-complete', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.registry.registerNodeWithSecret('api-n', TEST_SECRET, t);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const activate = await fetch(`${base}/nodes/api-n/activate`, { method: 'POST' });
      assert.strictEqual(activate.status, 200);
      const rotate = await fetch(`${base}/nodes/api-n/rotate`, { method: 'POST' });
      assert.strictEqual(rotate.status, 200);
      const rotateJson = await rotate.json() as { nextSecret?: string };
      assert.ok(typeof rotateJson.nextSecret === 'string' && rotateJson.nextSecret.length > 0);
      const complete = await fetch(`${base}/nodes/api-n/rotation/complete`, { method: 'POST' });
      assert.strictEqual(complete.status, 200);
      const revoke = await fetch(`${base}/nodes/api-n/revoke`, { method: 'POST' });
      assert.strictEqual(revoke.status, 200);
    } finally {
      await cp.shutdown();
    }
  });

  it('rotation secret is returned once: second call returns 409', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false }));
    cp.registry.registerNodeWithSecret('once-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('once-n'), true);
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const first = await fetch(`${base}/nodes/once-n/rotate`, { method: 'POST' });
      const second = await fetch(`${base}/nodes/once-n/rotate`, { method: 'POST' });
      assert.strictEqual(first.status, 200);
      assert.strictEqual(second.status, 409);
    } finally {
      await cp.shutdown();
    }
  });

  it('rotation expiration rejects ingest and restores ACTIVE', async () => {
    let t = 1_700_000_000_000;
    const cp = trackControlPlane(new ControlPlane({ now: () => t, persist: false, requireSignedIngest: true }));
    cp.registry.registerNodeWithSecret('ttl-n', TEST_SECRET, t);
    assert.strictEqual(cp.activateNode('ttl-n'), true);
    assert.strictEqual(cp.registry.startRotation('ttl-n', TEST_NEXT_SECRET, t), true);
    t += 10 * 60 * 1000 + 1;
    const { port } = await listenControlPlaneHttpServer({ controlPlane: cp, port: 0 });
    try {
      const base = `http://127.0.0.1:${port}`;
      const res = await postSignedIngest(base, 'ttl-n', TEST_SECRET, t);
      assert.strictEqual(res.status, 401);
      const state = cp.registry.getNode('ttl-n', t)!;
      assert.strictEqual(state.trustState, 'ACTIVE');
      assert.strictEqual(state.nextSecret, undefined);
    } finally {
      await cp.shutdown();
    }
  });

  it('trust state recovery sets missing trustState to PENDING', () => {
    const cp = trackControlPlane(new ControlPlane({ persist: false }));
    const reg = cp.registry as unknown as { nodes: Map<string, any>; recoverTrustState: (strict: boolean) => void };
    reg.nodes.set('recover-n', {
      lastSeen: 0,
      pinnedOffline: false,
      activeSecret: TEST_SECRET,
      createdAt: 1_700_000_000_000,
    });
    reg.recoverTrustState(false);
    const info = cp.registry.getNode('recover-n', Date.now())!;
    assert.strictEqual(info.trustState, 'PENDING');
  });
});
