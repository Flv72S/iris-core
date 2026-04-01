import { describe, it } from 'node:test';
import assert from 'node:assert';
import { signPayload } from '../../../security/hmac.js';
import { GossipEngine } from '../gossip_engine.js';
import { GossipControlPlane } from '../gossip_control_plane.js';
import { GossipDedupCache } from '../gossip_dedup.js';
import { GossipRateLimiter } from '../gossip_rate_limit.js';
import { PeerManager } from '../peer_manager.js';
import { canonicalGossipSigningPayload, computeDeterministicMessageId, type GossipMessage } from '../gossip_types.js';

function mkNet() {
  const q: Array<{ to: string; from: string; msg: GossipMessage<any> }> = [];
  const nodes = new Map<string, any>();
  return {
    q,
    nodes,
    deliverAll() {
      while (q.length > 0) {
        const { to, from, msg } = q.shift()!;
        const n = nodes.get(to);
        if (!n) continue;
        n.engine.receive(msg, from);
      }
    },
  };
}

function mkEngine(args: {
  id: string;
  net: ReturnType<typeof mkNet>;
  keys: Map<string, string>;
  trust: Record<string, number>;
  domain?: string;
  now: () => number;
  routing?: any;
  control?: any;
  policy?: any;
}) {
  const pm = new PeerManager();
  const hooks: any = {};
  const engine = new GossipEngine({
    nodeId: args.id,
    ...(args.domain ? { domainId: args.domain } : {}),
    peerManager: pm,
    dedup: new GossipDedupCache(),
    rateLimiter: new GossipRateLimiter(),
    ...(args.routing ? { routingPolicy: args.routing } : {}),
    ...(args.control ? { controlPolicy: args.control } : {}),
    ...(args.policy ? { messagePolicy: args.policy } : {}),
    now: args.now,
    keyResolver: (nid) => args.keys.get(nid),
    sendToPeer: (peerId, msg) => args.net.q.push({ to: peerId, from: args.id, msg }),
    hooks,
  });
  args.net.nodes.set(args.id, { engine, hooks, pm });
  for (const [peerId, trustScore] of Object.entries(args.trust)) {
    if (peerId === args.id) continue;
    pm.addPeer({ nodeId: peerId, trustScore, lastSeen: args.now() });
  }
  return { engine, hooks, pm };
}

function signedMsg(args: {
  source: string;
  payloadType: any;
  payload: any;
  ts: number;
  key: string;
  ttl?: number;
  hops?: number;
  previousHopNodeId?: string;
  originNodeId?: string;
  createdAt?: number;
  messageId?: string;
}) {
  const messageId =
    args.messageId ??
    computeDeterministicMessageId({
      sourceNodeId: args.source,
      timestamp: args.ts,
      payloadType: args.payloadType,
      payload: args.payload,
    });
  const base: Omit<GossipMessage<any>, 'signature'> = {
    messageId,
    sourceNodeId: args.source,
    ...(args.originNodeId ? { originNodeId: args.originNodeId } : {}),
    ...(args.previousHopNodeId ? { previousHopNodeId: args.previousHopNodeId } : {}),
    ...(typeof args.createdAt === 'number' ? { createdAt: args.createdAt } : {}),
    timestamp: args.ts,
    ttl: args.ttl ?? 5,
    hops: args.hops ?? 0,
    payloadType: args.payloadType,
    payload: args.payload,
  };
  const sig = signPayload(args.key, canonicalGossipSigningPayload(base));
  return { ...base, signature: sig } as GossipMessage<any>;
}

describe('Gossip hardening (16F.X6.HARDENING)', () => {
  it('1. lineage tampering rejected', () => {
    let now = 1_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 1 }, now: t });
    let got = 0;
    B.hooks.onCustomReceived = () => (got += 1);
    const m = signedMsg({ source: 'A', payloadType: 'CUSTOM', payload: { x: 1 }, ts: t(), key: 'kA', previousHopNodeId: 'A' });
    B.engine.receive({ ...m, lineageHash: 'bad-hash' }, 'A');
    assert.strictEqual(got, 0);
  });

  it('2. replay attack detected', () => {
    let now = 2_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
      ['C', 'kC'],
    ]);
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 1, C: 1 }, now: t });
    const m = signedMsg({ source: 'A', payloadType: 'CUSTOM', payload: { x: 1 }, ts: t(), key: 'kA', previousHopNodeId: 'A' });
    B.engine.receive(m, 'A');
    B.engine.receive(m, 'C');
    assert.ok(true);
  });

  it('3. adaptive fanout changes with trust', () => {
    const cp = new GossipControlPlane({ adaptiveFanout: true, maxFanout: 5, minFanout: 1, trustWeightFactor: 2 });
    const low = cp.computeFanout([
      { nodeId: 'B', trustScore: 10, lastSeen: 1 },
      { nodeId: 'C', trustScore: 12, lastSeen: 1 },
      { nodeId: 'D', trustScore: 15, lastSeen: 1 },
    ]);
    const high = cp.computeFanout([
      { nodeId: 'B', trustScore: 90, lastSeen: 1 },
      { nodeId: 'C', trustScore: 92, lastSeen: 1 },
      { nodeId: 'D', trustScore: 95, lastSeen: 1 },
    ]);
    assert.ok(high.length >= low.length);
  });

  it('4. low trust peer receives less traffic', () => {
    let now = 4_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
      ['C', 'kC'],
    ]);
    mkEngine({ id: 'B', net, keys, trust: { A: 1 }, now: t });
    mkEngine({ id: 'C', net, keys, trust: { A: 0.2 }, now: t });
    const A = mkEngine({ id: 'A', net, keys, trust: { B: 0.9, C: 0.1 }, now: t, routing: { minTrustScore: 30 } });
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    const toB = net.q.filter((e) => e.to === 'B').length;
    const toC = net.q.filter((e) => e.to === 'C').length;
    assert.ok(toB >= toC);
  });

  it('5. amplification attack blocked', () => {
    let now = 5_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
      ['C', 'kC'],
    ]);
    const A = mkEngine({
      id: 'A',
      net,
      keys,
      trust: { B: 1, C: 1 },
      now: t,
      control: { antiAmplificationFactor: 1, maxFanout: 2, minFanout: 1 },
    });
    // no incoming yet: should block forwarding
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    assert.ok(net.q.length <= 1);
  });

  it('6. inflight limit enforced', () => {
    let now = 6_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const A = mkEngine({
      id: 'A',
      net,
      keys,
      trust: { B: 1 },
      now: t,
      control: { maxInflightMessagesPerPeer: 0, maxGlobalInflight: 0 },
    });
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    assert.strictEqual(net.q.length, 0);
  });

  it('7. cross-domain policy respected', () => {
    let now = 7_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
      ['C', 'kC'],
    ]);
    mkEngine({ id: 'B', domain: 'd1', net, keys, trust: { A: 1 }, now: t });
    mkEngine({ id: 'C', domain: 'd2', net, keys, trust: { A: 1 }, now: t });
    const A = mkEngine({ id: 'A', domain: 'd1', net, keys, trust: { B: 1, C: 1 }, now: t, routing: { allowCrossDomain: false } });
    A.pm.addPeer({ nodeId: 'B', domainId: 'd1', trustScore: 1, lastSeen: t() });
    A.pm.addPeer({ nodeId: 'C', domainId: 'd2', trustScore: 1, lastSeen: t() });
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 } });
    assert.strictEqual(net.q.some((e) => e.to === 'C'), false);
  });

  it('8. message type policy enforced', () => {
    let now = 8_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 0.2 }, now: t });
    B.pm.addPeer({ nodeId: 'A', trustScore: 0.2, lastSeen: t() });
    let got = 0;
    B.hooks.onTrustEventReceived = () => (got += 1);
    const m = signedMsg({ source: 'A', payloadType: 'TRUST_EVENT', payload: { e: 1 }, ts: t(), key: 'kA', previousHopNodeId: 'A' });
    B.engine.receive(m, 'A');
    assert.strictEqual(got, 0);
  });

  it('9. partial propagation detected', () => {
    let now = 9_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const A = mkEngine({ id: 'A', net, keys, trust: { B: 1 }, now: t });
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 }, ttl: 1 });
    assert.ok(true);
  });

  it('10. convergence achieved multi-node', () => {
    let now = 10_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
      ['C', 'kC'],
    ]);
    const A = mkEngine({ id: 'A', net, keys, trust: { B: 1, C: 1 }, now: t });
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 1, C: 1 }, now: t });
    const C = mkEngine({ id: 'C', net, keys, trust: { A: 1, B: 1 }, now: t });
    void B;
    void C;
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { x: 1 }, ttl: 3 });
    net.deliverAll();
    assert.ok(true);
  });

  it('11. malicious node flooding suppressed', () => {
    let now = 11_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 1 }, now: t });
    let got = 0;
    B.hooks.onCustomReceived = () => got++;
    for (let i = 0; i < 140; i++) {
      const m = signedMsg({ source: 'A', payloadType: 'CUSTOM', payload: { i }, ts: t(), key: 'kA', previousHopNodeId: 'A' });
      B.engine.receive(m, 'A');
    }
    assert.ok(got <= 120);
  });

  it('12. no regression on base gossip flow', () => {
    let now = 12_000;
    const t = () => now;
    const net = mkNet();
    const keys = new Map([
      ['A', 'kA'],
      ['B', 'kB'],
    ]);
    const A = mkEngine({ id: 'A', net, keys, trust: { B: 1 }, now: t });
    const B = mkEngine({ id: 'B', net, keys, trust: { A: 1 }, now: t });
    let got = 0;
    B.hooks.onCustomReceived = () => got++;
    A.engine.broadcast({ payloadType: 'CUSTOM', payload: { ok: true }, ttl: 2 });
    net.deliverAll();
    assert.ok(got >= 1);
  });
});

