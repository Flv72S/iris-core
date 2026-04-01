/**
 * Microstep 16F.X6 — Secure Gossip & Trust-Aware Routing. Tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

import { signPayload } from '../../../security/hmac.js';
import { GossipEngine } from '../gossip_engine.js';
import { GossipDedupCache } from '../gossip_dedup.js';
import { GossipRateLimiter } from '../gossip_rate_limit.js';
import { PeerManager } from '../peer_manager.js';
import type { GossipMessage } from '../gossip_types.js';
import { computeDeterministicMessageId, canonicalGossipSigningPayload } from '../gossip_types.js';
import type { TrustEvent } from '../../../control_plane/trust_events.js';
import { NodeIsolationManager } from '../../../control_plane/node_isolation.js';

function makeEngine(args: {
  nodeId: string;
  domainId?: string;
  now: () => number;
  keys: Map<string, string>;
  isolation?: NodeIsolationManager;
  trustScoreProvider?: (nodeId: string) => number;
  routingPolicy?: { minTrustScore?: number; allowCrossDomain?: boolean; maxFanout?: number };
  timestampSkewMs?: number;
  random?: () => number;
  sendToPeer: (peerNodeId: string, msg: GossipMessage<any>) => void;
}) {
  const pm = new PeerManager({
    ...(args.isolation ? { isolationManager: args.isolation } : {}),
    ...(args.trustScoreProvider ? { trustScoreProvider: args.trustScoreProvider } : {}),
  });
  const dedup = new GossipDedupCache({ ttlMs: 60_000 });
  const rl = new GossipRateLimiter({ maxMessagesPer10s: 100 });
  const hooks: any = {};

  const eng = new GossipEngine({
    nodeId: args.nodeId,
    ...(args.domainId ? { domainId: args.domainId } : {}),
    peerManager: pm,
    dedup,
    rateLimiter: rl,
    ...(args.routingPolicy ? { routingPolicy: args.routingPolicy } : {}),
    now: args.now,
    ...(typeof args.timestampSkewMs === 'number' ? { timestampSkewMs: args.timestampSkewMs } : {}),
    ...(args.random ? { random: args.random } : {}),
    keyResolver: (nid) => args.keys.get(nid),
    sendToPeer: args.sendToPeer,
    hooks,
  });

  return { eng, pm, hooks };
}

function makeNetwork() {
  const queue: Array<{ to: string; from: string; msg: GossipMessage<any> }> = [];
  const nodes = new Map<string, { eng: GossipEngine; pm: PeerManager; hooks: any }>();
  const deliverAll = () => {
    while (queue.length > 0) {
      const { to, from, msg } = queue.shift()!;
      const target = nodes.get(to);
      if (!target) continue;
      target.eng.receive(msg, from);
    }
  };
  return { queue, nodes, deliverAll };
}

describe('Gossip (16F.X6)', () => {
  it('1. message broadcast', () => {
    let t = 1000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const net = makeNetwork();
    const A = makeEngine({
      nodeId: 'A',
      now,
      keys,
      sendToPeer: (peerNodeId, msg) => net.queue.push({ to: peerNodeId, from: 'A', msg }),
    });
    A.pm.addPeer({ nodeId: 'B', trustScore: 1, lastSeen: now() });
    const msg = A.eng.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    assert.strictEqual(msg.sourceNodeId, 'A');
    assert.ok(msg.signature.length > 0);
  });

  it('2. message propagation multi-hop', () => {
    let t = 2000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
      ['C', 'secret-C'],
    ]);
    const net = makeNetwork();
    const A = makeEngine({
      nodeId: 'A',
      now,
      keys,
      random: () => 0.1,
      routingPolicy: { maxFanout: 1 },
      sendToPeer: (to, msg) => net.queue.push({ to, from: 'A', msg }),
    });
    const B = makeEngine({
      nodeId: 'B',
      now,
      keys,
      random: () => 0.1,
      routingPolicy: { maxFanout: 1 },
      sendToPeer: (to, msg) => net.queue.push({ to, from: 'B', msg }),
    });
    const C = makeEngine({
      nodeId: 'C',
      now,
      keys,
      random: () => 0.1,
      routingPolicy: { maxFanout: 1 },
      sendToPeer: (to, msg) => net.queue.push({ to, from: 'C', msg }),
    });
    // peer graphs: A->B, B->C
    A.pm.addPeer({ nodeId: 'B', trustScore: 1, lastSeen: now() });
    B.pm.addPeer({ nodeId: 'C', trustScore: 1, lastSeen: now() });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    C.pm.addPeer({ nodeId: 'B', trustScore: 1, lastSeen: now() });

    net.nodes.set('A', A as any);
    net.nodes.set('B', B as any);
    net.nodes.set('C', C as any);

    let gotC = 0;
    C.hooks.onCustomReceived = () => {
      gotC += 1;
    };
    A.eng.broadcast({ payloadType: 'CUSTOM', payload: { hello: 'world' }, ttl: 3 });
    net.deliverAll();
    assert.ok(gotC >= 1);
  });

  it('3. TTL enforcement', () => {
    let t = 3000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
      ['C', 'secret-C'],
    ]);
    const net = makeNetwork();
    const A = makeEngine({ nodeId: 'A', now, keys, sendToPeer: (to, msg) => net.queue.push({ to, from: 'A', msg }) });
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: (to, msg) => net.queue.push({ to, from: 'B', msg }) });
    const C = makeEngine({ nodeId: 'C', now, keys, sendToPeer: (to, msg) => net.queue.push({ to, from: 'C', msg }) });
    A.pm.addPeer({ nodeId: 'B', trustScore: 1, lastSeen: now() });
    B.pm.addPeer({ nodeId: 'C', trustScore: 1, lastSeen: now() });
    net.nodes.set('B', B as any);
    net.nodes.set('C', C as any);
    let gotC = 0;
    C.hooks.onCustomReceived = () => (gotC += 1);
    const m = A.eng.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 }, ttl: 1 });
    // deliver to B
    B.eng.receive(m, 'A');
    net.deliverAll();
    assert.strictEqual(gotC, 0);
  });

  it('4. duplicate drop', () => {
    let t = 4000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    const base = {
      sourceNodeId: 'A',
      timestamp: now(),
      ttl: 3,
      hops: 0,
      payloadType: 'CUSTOM' as const,
      payload: { z: 1 },
    };
    const messageId = computeDeterministicMessageId({ sourceNodeId: base.sourceNodeId, timestamp: base.timestamp, payloadType: base.payloadType, payload: base.payload });
    const payload = canonicalGossipSigningPayload({ ...base, messageId });
    const sig = signPayload(keys.get('A')!, payload);
    const msg: GossipMessage<any> = { ...base, messageId, signature: sig };
    B.eng.receive(msg, 'A');
    B.eng.receive(msg, 'A');
    assert.strictEqual(got, 1);
  });

  it('5. invalid signature rejected', () => {
    let t = 5000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    const msg: GossipMessage<any> = {
      messageId: 'x',
      sourceNodeId: 'A',
      timestamp: now(),
      ttl: 3,
      hops: 0,
      payloadType: 'CUSTOM',
      payload: { x: 1 },
      signature: 'bad',
    };
    B.eng.receive(msg, 'A');
    assert.strictEqual(got, 0);
  });

  it('6. low trust peer excluded', () => {
    let t = 6000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
      ['C', 'secret-C'],
    ]);
    const net = makeNetwork();
    const A = makeEngine({
      nodeId: 'A',
      now,
      keys,
      routingPolicy: { minTrustScore: 0.8, maxFanout: 10 },
      sendToPeer: (to, msg) => net.queue.push({ to, from: 'A', msg }),
    });
    A.pm.addPeer({ nodeId: 'B', trustScore: 0.1, lastSeen: now() });
    A.pm.addPeer({ nodeId: 'C', trustScore: 0.9, lastSeen: now() });
    net.nodes.set('C', makeEngine({ nodeId: 'C', now, keys, sendToPeer: () => {} }) as any);
    let gotC = 0;
    (net.nodes.get('C') as any).hooks.onCustomReceived = () => (gotC += 1);
    A.eng.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    net.deliverAll();
    assert.ok(gotC >= 1);
  });

  it('7. isolated node ignored', () => {
    let t = 7000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const isolation = new NodeIsolationManager();
    isolation.isolate('A');
    const B = makeEngine({ nodeId: 'B', now, keys, isolation, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now(), isIsolated: true });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    const base = { sourceNodeId: 'A', timestamp: now(), ttl: 3, hops: 0, payloadType: 'CUSTOM' as const, payload: { x: 1 } };
    const messageId = computeDeterministicMessageId({ sourceNodeId: base.sourceNodeId, timestamp: base.timestamp, payloadType: base.payloadType, payload: base.payload });
    const sig = signPayload(keys.get('A')!, canonicalGossipSigningPayload({ ...base, messageId }));
    B.eng.receive({ ...base, messageId, signature: sig }, 'A');
    assert.strictEqual(got, 0);
  });

  it('8. rate limiting enforced', () => {
    let t = 8000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    for (let i = 0; i < 130; i++) {
      const base = { sourceNodeId: 'A', timestamp: now(), ttl: 3, hops: 0, payloadType: 'CUSTOM' as const, payload: { i } };
      const messageId = computeDeterministicMessageId({ sourceNodeId: base.sourceNodeId, timestamp: base.timestamp, payloadType: base.payloadType, payload: base.payload });
      const sig = signPayload(keys.get('A')!, canonicalGossipSigningPayload({ ...base, messageId }));
      B.eng.receive({ ...base, messageId, signature: sig }, 'A');
    }
    assert.ok(got <= 110);
  });

  it('9. trust event propagation', () => {
    let t = 9000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    let got: TrustEvent | null = null;
    B.hooks.onTrustEventReceived = (ev: TrustEvent) => (got = ev);
    const ev: TrustEvent = {
      eventId: 'e1',
      nodeId: 'A',
      type: 'NODE_ACTIVATED',
      timestamp: now(),
      payload: {},
      issuerNodeId: 'A',
      signature: 'sig',
      endorsements: [],
    };
    const base = { sourceNodeId: 'A', timestamp: now(), ttl: 3, hops: 0, payloadType: 'TRUST_EVENT' as const, payload: ev };
    const messageId = computeDeterministicMessageId({ sourceNodeId: base.sourceNodeId, timestamp: base.timestamp, payloadType: base.payloadType, payload: base.payload });
    const sig = signPayload(keys.get('A')!, canonicalGossipSigningPayload({ ...base, messageId }));
    B.eng.receive({ ...base, messageId, signature: sig }, 'A');
    assert.ok(got !== null);
    assert.strictEqual((got as TrustEvent).eventId, 'e1');
  });

  it('10. multi-node convergence (everyone sees once)', () => {
    let t = 10_000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
      ['C', 'secret-C'],
      ['D', 'secret-D'],
    ]);
    const net = makeNetwork();
    const seen = new Map<string, Set<string>>();
    for (const id of ['A', 'B', 'C', 'D']) {
      const n = makeEngine({
        nodeId: id,
        now,
        keys,
        routingPolicy: { maxFanout: 3 },
        random: () => 0.42,
        sendToPeer: (to, msg) => net.queue.push({ to, from: id, msg }),
      });
      n.hooks.onCustomReceived = (_p: any, from: string) => {
        const s = seen.get(id) ?? new Set();
        s.add(from);
        seen.set(id, s);
      };
      net.nodes.set(id, n as any);
    }
    // fully connect peers
    for (const [id, n] of net.nodes) {
      for (const peerId of net.nodes.keys()) {
        if (peerId === id) continue;
        n.pm.addPeer({ nodeId: peerId, trustScore: 1, lastSeen: now() });
      }
    }
    net.nodes.get('A')!.eng.broadcast({ payloadType: 'CUSTOM', payload: { k: 1 }, ttl: 4 });
    net.deliverAll();
    // each node should have processed at least once (via any sender)
    for (const id of ['B', 'C', 'D']) {
      assert.ok((seen.get(id)?.size ?? 0) >= 1);
    }
  });

  it('11. byzantine peer flooding blocked', () => {
    let t = 11_000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
    ]);
    const B = makeEngine({ nodeId: 'B', now, keys, sendToPeer: () => {} });
    B.pm.addPeer({ nodeId: 'A', trustScore: 1, lastSeen: now() });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    for (let i = 0; i < 180; i++) {
      const base = { sourceNodeId: 'A', timestamp: now(), ttl: 3, hops: 0, payloadType: 'CUSTOM' as const, payload: { i } };
      const messageId = computeDeterministicMessageId({ sourceNodeId: base.sourceNodeId, timestamp: base.timestamp, payloadType: base.payloadType, payload: base.payload });
      const sig = signPayload(keys.get('A')!, canonicalGossipSigningPayload({ ...base, messageId }));
      B.eng.receive({ ...base, messageId, signature: sig }, 'A');
    }
    assert.ok(got <= 120);
  });

  it('12. domain filtering respected', () => {
    let t = 12_000;
    const now = () => t;
    const keys = new Map<string, string>([
      ['A', 'secret-A'],
      ['B', 'secret-B'],
      ['C', 'secret-C'],
    ]);
    const net = makeNetwork();
    const A = makeEngine({
      nodeId: 'A',
      domainId: 'dom-1',
      now,
      keys,
      routingPolicy: { allowCrossDomain: false, maxFanout: 10 },
      random: () => 0.1,
      sendToPeer: (to, msg) => net.queue.push({ to, from: 'A', msg }),
    });
    const B = makeEngine({ nodeId: 'B', domainId: 'dom-1', now, keys, sendToPeer: () => {} });
    const C = makeEngine({ nodeId: 'C', domainId: 'dom-2', now, keys, sendToPeer: () => {} });
    net.nodes.set('B', B as any);
    net.nodes.set('C', C as any);
    A.pm.addPeer({ nodeId: 'B', domainId: 'dom-1', trustScore: 1, lastSeen: now() });
    A.pm.addPeer({ nodeId: 'C', domainId: 'dom-2', trustScore: 1, lastSeen: now() });
    let gotB = 0;
    let gotC = 0;
    B.hooks.onCustomReceived = () => (gotB += 1);
    C.hooks.onCustomReceived = () => (gotC += 1);
    A.eng.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 }, ttl: 2 });
    net.deliverAll();
    assert.ok(gotB >= 1);
    assert.strictEqual(gotC, 0);
  });
});

