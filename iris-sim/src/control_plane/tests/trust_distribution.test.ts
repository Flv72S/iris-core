import assert from 'node:assert';
import { describe, it } from 'node:test';

import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';
import { makeLocalTrustEvent } from '../trust_sync_engine.js';

type NodeCtx = {
  id: string;
  secret: string;
  registry: ControlPlaneRegistry;
  engine: TrustSyncEngine;
};

function setupNodes(ids: string[]): Record<string, NodeCtx> {
  const secrets: Record<string, string> = Object.fromEntries(ids.map((id) => [id, `${id}-shared-secret-01234567890123456789`]));
  const registries: Record<string, ControlPlaneRegistry> = Object.fromEntries(ids.map((id) => [id, new ControlPlaneRegistry()]));
  const out: Record<string, NodeCtx> = {} as Record<string, NodeCtx>;

  for (const id of ids) {
    const peers = ids.filter((x) => x !== id);
    const engine = new TrustSyncEngine({
      localNodeId: id,
      localSecret: secrets[id],
      registry: registries[id],
      resolveIssuerSecret: (issuer) => secrets[issuer],
      send: (_event) => {
        // Wire later per-test for deterministic order.
      },
      now: () => Date.now(),
    });
    out[id] = { id, secret: secrets[id], registry: registries[id], engine };
    for (const p of peers) {
      registries[id].registerNodeWithSecret(p, `${p}-node-secret-abcdefghijklmnopqrstuvwxyz`, Date.now());
      registries[id].activateNode(p, Date.now());
    }
  }
  return out;
}

describe('Distributed trust propagation (16E)', () => {
  it('TEST 1 — base propagation activation', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    const event = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      payload: {},
      timestamp: 100,
    });
    b.engine.receive(event);

    const info = b.registry.getNode('X', 200);
    assert.ok(info);
    assert.strictEqual(info?.trustState, 'ACTIVE');
  });

  it('TEST 2 — propagated revoke reflected on peer', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    b.registry.registerNodeWithSecret('X', 'x-secret-abcdefghijklmnopqrstuvwxyz012345', 1);
    b.registry.activateNode('X', 2);

    const event = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      payload: {},
      timestamp: 300,
    });
    b.engine.receive(event);
    const info = b.registry.getNode('X', 301);
    assert.strictEqual(info?.trustState, 'REVOKED');
  });

  it('TEST 3 — distributed rotation start and complete', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    for (const n of [a.registry, b.registry]) {
      n.registerNodeWithSecret('X', 'x-secret-abcdefghijklmnopqrstuvwxyz012345', 10);
      n.activateNode('X', 11);
    }

    const startEv = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'ROTATION_STARTED',
      nodeId: 'X',
      payload: { nextSecret: 'x-next-secret-abcdefghijklmnopqrstuvwxyz1234' },
      timestamp: 500,
    });
    b.engine.receive(startEv);
    assert.strictEqual(b.registry.getNodeAuth('X')?.trustState, 'ROTATING');

    const doneEv = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'ROTATION_COMPLETED',
      nodeId: 'X',
      payload: {},
      timestamp: 600,
    });
    b.engine.receive(doneEv);
    assert.strictEqual(b.registry.getNodeAuth('X')?.trustState, 'ACTIVE');
  });

  it('TEST 4 — deduplication applies same event once', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    const ev = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      payload: {},
      timestamp: 700,
    });
    b.engine.receive(ev);
    b.engine.receive(ev);
    b.engine.receive(ev);

    const snap = b.engine.getTrustSnapshot();
    assert.strictEqual(snap.X.updatedAt, 700);
    assert.strictEqual(snap.X.trustState, 'ACTIVE');
  });

  it('TEST 5 — invalid signature is ignored', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    const ev = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      payload: {},
      timestamp: 800,
    });
    const tampered = { ...ev, signature: 'invalid-signature' };
    b.engine.receive(tampered);
    assert.strictEqual(b.registry.has('X'), false);
  });

  it('TEST 6 — conflict handling old event ignored', () => {
    const nodes = setupNodes(['A', 'B']);
    const a = nodes.A;
    const b = nodes.B;
    a.engine.start();
    b.engine.start();

    const newer = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      payload: {},
      timestamp: 1000,
    });
    b.engine.receive(newer);

    const older = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: a.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      payload: {},
      timestamp: 900,
    });
    b.engine.receive(older);

    assert.strictEqual(b.registry.getNode('X', 1001)?.trustState, 'REVOKED');
  });

  it('TEST 7 — multi-node convergence with reordered deliveries', () => {
    const nodes = setupNodes(['A', 'B', 'C']);
    const a = nodes.A;
    const b = nodes.B;
    const c = nodes.C;
    a.engine.start();
    b.engine.start();
    c.engine.start();

    for (const n of [a.registry, b.registry, c.registry]) {
      n.registerNodeWithSecret('X', 'x-secret-abcdefghijklmnopqrstuvwxyz012345', 1);
      n.activateNode('X', 2);
    }

    const events = [
      makeLocalTrustEvent({
        issuerNodeId: 'A',
        signingSecret: a.secret,
        type: 'ROTATION_STARTED',
        nodeId: 'X',
        payload: { nextSecret: 'x-next-secret-abcdefghijklmnopqrstuvwxyz1234' },
        timestamp: 1100,
      }),
      makeLocalTrustEvent({
        issuerNodeId: 'A',
        signingSecret: a.secret,
        type: 'ROTATION_COMPLETED',
        nodeId: 'X',
        payload: {},
        timestamp: 1200,
      }),
      makeLocalTrustEvent({
        issuerNodeId: 'A',
        signingSecret: a.secret,
        type: 'NODE_REVOKED',
        nodeId: 'X',
        payload: {},
        timestamp: 1300,
      }),
    ];

    // Deliver in different order per node; convergence should still end in REVOKED.
    for (const ev of [events[1], events[0], events[2]]) b.engine.receive(ev);
    for (const ev of [events[0], events[2], events[1]]) c.engine.receive(ev);

    assert.strictEqual(a.registry.getNode('X', 1400)?.trustState, 'ACTIVE');
    // Apply the same full set to A in yet another order.
    for (const ev of [events[2], events[0], events[1]]) a.engine.receive(ev);

    const sA = a.engine.getTrustSnapshot();
    const sB = b.engine.getTrustSnapshot();
    const sC = c.engine.getTrustSnapshot();
    assert.strictEqual(sA.X.trustState, 'REVOKED');
    assert.strictEqual(sB.X.trustState, 'REVOKED');
    assert.strictEqual(sC.X.trustState, 'REVOKED');
  });
});
