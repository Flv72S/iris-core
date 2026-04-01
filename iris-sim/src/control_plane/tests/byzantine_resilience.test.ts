import assert from 'node:assert';
import { describe, it } from 'node:test';

import { signPayload } from '../../security/hmac.js';
import { stableStringify } from '../../security/stable_json.js';
import { createUnsignedTrustEvent, type TrustEvent, type TrustEventType } from '../trust_events.js';
import { signTrustEvent } from '../../security/trust_event_crypto.js';
import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';

type NodeCtx = {
  id: string;
  secret: string;
  registry: ControlPlaneRegistry;
  engine: TrustSyncEngine;
};

function mkSecrets(ids: string[]): Record<string, string> {
  return Object.fromEntries(ids.map((id) => [id, `${id}-shared-secret-01234567890123456789`]));
}

function buildEvent(args: {
  issuerNodeId: string;
  issuerSecret: string;
  type: TrustEventType;
  nodeId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
  endorsers?: Array<{ nodeId: string; secret: string }>;
}): TrustEvent {
  const base = createUnsignedTrustEvent({
    issuerNodeId: args.issuerNodeId,
    nodeId: args.nodeId,
    type: args.type,
    timestamp: args.timestamp,
    payload: args.payload ?? {},
  });
  const endorsements = (args.endorsers ?? []).map((e) => ({
    nodeId: e.nodeId,
    signature: signPayload(
      e.secret,
      stableStringify({
        eventId: base.eventId,
        issuerNodeId: base.issuerNodeId,
        nodeId: base.nodeId,
        timestamp: base.timestamp,
        type: base.type,
      }),
    ),
  }));
  return {
    ...base,
    endorsements,
    signature: signTrustEvent({ ...base, endorsements }, args.issuerSecret),
  };
}

function setup(ids: string[]): Record<string, NodeCtx> {
  const secrets = mkSecrets(ids);
  const regs: Record<string, ControlPlaneRegistry> = Object.fromEntries(ids.map((id) => [id, new ControlPlaneRegistry()]));
  const out: Record<string, NodeCtx> = {} as Record<string, NodeCtx>;

  for (const id of ids) {
    const registry = regs[id];
    for (const p of ids.filter((x) => x !== id)) {
      registry.registerNodeWithSecret(p, `${p}-node-secret-abcdefghijklmnopqrstuvwxyz`, 1);
      registry.activateNode(p, 2);
    }
    registry.registerNodeWithSecret('X', 'x-secret-abcdefghijklmnopqrstuvwxyz012345', 1);
    registry.activateNode('X', 2);

    const engine = new TrustSyncEngine({
      localNodeId: id,
      localSecret: secrets[id],
      registry,
      resolveIssuerSecret: (issuer) => secrets[issuer],
      send: () => {},
      now: () => Date.now(),
      quorumPolicy: { minSignatures: 2, minReputationScore: 50 },
    });
    engine.start();
    out[id] = { id, secret: secrets[id], registry, engine };
  }
  return out;
}

describe('Byzantine resilience (16F)', () => {
  it('TEST 1 — malevolent node gets isolated', () => {
    const n = setup(['A', 'B', 'M']);
    const a = n.A;
    const bad = buildEvent({
      issuerNodeId: 'M',
      issuerSecret: 'wrong-secret',
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 100,
      endorsers: [
        { nodeId: 'A', secret: n.A.secret },
        { nodeId: 'B', secret: n.B.secret },
      ],
    });
    for (let i = 0; i < 10; i++) {
      a.engine.receive({ ...bad, eventId: `${bad.eventId}-${i}` });
    }
    assert.strictEqual(a.engine.isNodeIsolated('M'), true);
  });

  it('TEST 2 — event without quorum is ignored', () => {
    const n = setup(['A', 'B', 'C']);
    const a = n.A;
    const ev = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 110,
      endorsers: [{ nodeId: 'B', secret: n.B.secret }],
    });
    a.engine.receive(ev);
    assert.strictEqual(a.registry.getNode('X', 111)?.trustState, 'ACTIVE');
  });

  it('TEST 3 — valid quorum endorsement accepts event', () => {
    const n = setup(['A', 'B', 'C']);
    const a = n.A;
    const ev = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 120,
      endorsers: [
        { nodeId: 'B', secret: n.B.secret },
        { nodeId: 'C', secret: n.C.secret },
      ],
    });
    a.engine.receive(ev);
    assert.strictEqual(a.registry.getNode('X', 121)?.trustState, 'REVOKED');
  });

  it('TEST 4 — replay/spam variant is detected and blocked', () => {
    const n = setup(['A', 'B', 'C']);
    const a = n.A;
    const base = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 130,
      endorsers: [
        { nodeId: 'B', secret: n.B.secret },
        { nodeId: 'C', secret: n.C.secret },
      ],
    });
    a.engine.receive(base);
    const conflict = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      timestamp: 131,
      endorsers: [
        { nodeId: 'B', secret: n.B.secret },
        { nodeId: 'C', secret: n.C.secret },
      ],
    });
    a.engine.receive(conflict);
    assert.strictEqual(a.registry.getNode('X', 132)?.trustState, 'REVOKED');
  });

  it('TEST 5 — rapid activate+revoke raises violations (reputation drops)', () => {
    const n = setup(['A', 'B', 'C']);
    const a = n.A;
    const e1 = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      timestamp: 200,
      endorsers: [
        { nodeId: 'B', secret: n.B.secret },
        { nodeId: 'C', secret: n.C.secret },
      ],
    });
    const e2 = buildEvent({
      issuerNodeId: 'B',
      issuerSecret: n.B.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 201,
      endorsers: [
        { nodeId: 'B', secret: n.B.secret },
        { nodeId: 'C', secret: n.C.secret },
      ],
    });
    a.engine.receive(e1);
    a.engine.receive(e2);
    assert.ok(a.engine.getReputation('B').score < 100);
  });

  it('TEST 6 — isolated node can no longer influence state', () => {
    const n = setup(['A', 'B', 'M']);
    const a = n.A;
    // Force isolation with repeated invalid signatures.
    for (let i = 0; i < 10; i++) {
      const bad = buildEvent({
        issuerNodeId: 'M',
        issuerSecret: 'broken',
        type: 'NODE_REVOKED',
        nodeId: 'X',
        timestamp: 300 + i,
        endorsers: [
          { nodeId: 'A', secret: n.A.secret },
          { nodeId: 'B', secret: n.B.secret },
        ],
      });
      a.engine.receive(bad);
    }
    assert.strictEqual(a.engine.isNodeIsolated('M'), true);
    const before = a.registry.getNode('X', 400)?.trustState;
    const afterEv = buildEvent({
      issuerNodeId: 'M',
      issuerSecret: n.M.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 401,
      endorsers: [
        { nodeId: 'A', secret: n.A.secret },
        { nodeId: 'B', secret: n.B.secret },
      ],
    });
    a.engine.receive(afterEv);
    assert.strictEqual(a.registry.getNode('X', 402)?.trustState, before);
  });

  it('TEST 7 — honest nodes converge despite one malicious', () => {
    const n = setup(['A', 'B', 'M']);
    const a = n.A;
    const b = n.B;
    const honest = buildEvent({
      issuerNodeId: 'A',
      issuerSecret: n.A.secret,
      type: 'NODE_REVOKED',
      nodeId: 'X',
      timestamp: 500,
      endorsers: [
        { nodeId: 'A', secret: n.A.secret },
        { nodeId: 'B', secret: n.B.secret },
      ],
    });
    a.engine.receive(honest);
    b.engine.receive(honest);

    const malicious = buildEvent({
      issuerNodeId: 'M',
      issuerSecret: 'bad',
      type: 'NODE_ACTIVATED',
      nodeId: 'X',
      timestamp: 501,
      endorsers: [
        { nodeId: 'M', secret: n.M.secret },
        { nodeId: 'A', secret: n.A.secret },
      ],
    });
    a.engine.receive(malicious);
    b.engine.receive(malicious);

    assert.strictEqual(a.registry.getNode('X', 550)?.trustState, 'REVOKED');
    assert.strictEqual(b.registry.getNode('X', 550)?.trustState, 'REVOKED');
  });
});
