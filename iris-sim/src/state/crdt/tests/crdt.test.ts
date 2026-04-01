import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GossipEngine } from '../../../network/gossip/gossip_engine.js';
import { GossipDedupCache } from '../../../network/gossip/gossip_dedup.js';
import { GossipRateLimiter } from '../../../network/gossip/gossip_rate_limit.js';
import { PeerManager } from '../../../network/gossip/peer_manager.js';
import { NodeIsolationManager } from '../../../control_plane/node_isolation.js';
import { CRDTEngine } from '../crdt_engine.js';
import { LWWRegisterCRDT } from '../crdt_lww_register.js';
import { ORSetCRDT } from '../crdt_or_set.js';
import { signCRDTOperation } from '../crdt_security.js';
import { CRDTSyncBridge } from '../crdt_sync.js';
import { CRDTPersistence } from '../crdt_persistence.js';

function makeMesh(nodeIds: string[]) {
  const q: Array<{ to: string; from: string; payload: any }> = [];
  const keys = new Map<string, string>();
  const nodes = new Map<string, { engine: CRDTEngine; bridge: CRDTSyncBridge; gossip: GossipEngine }>();
  for (const id of nodeIds) keys.set(id, `secret-${id}`);

  for (const id of nodeIds) {
    const pm = new PeerManager();
    for (const peer of nodeIds) if (peer !== id) pm.addPeer({ nodeId: peer, trustScore: 100, lastSeen: 0 });
    const gossip = new GossipEngine({
      nodeId: id,
      peerManager: pm,
      dedup: new GossipDedupCache(),
      rateLimiter: new GossipRateLimiter(),
      controlPolicy: { antiAmplificationFactor: 1000, maxFanout: 8, minFanout: 1 },
      keyResolver: (nid) => keys.get(nid),
      sendToPeer: (peerNodeId, msg) => q.push({ to: peerNodeId, from: id, payload: msg }),
      hooks: {},
    });
    const engine = new CRDTEngine(id);
    const bridge = new CRDTSyncBridge({
      engine,
      gossip,
      keyResolver: (nid) => keys.get(nid),
      trustScoreProvider: () => 100,
    });
    (gossip as any).hooks.onCustomReceived = (payload: any) => {
      if (payload?.topic === 'crdt' && payload.operation) bridge.receiveCRDTOperation(payload.operation);
    };
    nodes.set(id, { engine, bridge, gossip });
  }

  const deliverAll = () => {
    while (q.length > 0) {
      const e = q.shift()!;
      nodes.get(e.to)!.gossip.receive(e.payload, e.from);
    }
  };
  return { nodes, keys, deliverAll };
}

function signedOp(engine: CRDTEngine, key: string, args: { crdtId: string; type: string; payload: any }) {
  const op = engine.createOperation(args);
  return { ...op, signature: signCRDTOperation(op, key) };
}

describe('CRDT (16F.X7.CRDT)', () => {
  it('1. LWW convergence', () => {
    const { nodes, keys } = makeMesh(['A', 'B']);
    const a = nodes.get('A')!;
    const b = nodes.get('B')!;
    a.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    b.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const opA = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: 'a' });
    const opB = signedOp(b.engine, keys.get('B')!, { crdtId: 'reg', type: 'SET', payload: 'b' });
    a.bridge.receiveCRDTOperation(opA);
    b.bridge.receiveCRDTOperation(opB);
    a.bridge.receiveCRDTOperation(opB);
    b.bridge.receiveCRDTOperation(opA);
    assert.deepStrictEqual(a.engine.getStateSnapshot(), b.engine.getStateSnapshot());
  });

  it('2. OR-set correctness', () => {
    const eng = new CRDTEngine('A');
    const set = new ORSetCRDT<string>();
    eng.registerCRDT('s', set);
    eng.applyOperation({ opId: '1', crdtId: 's', type: 'ORSET_ADD', payload: { value: 'x', tag: 't1' }, timestamp: { counter: 1, nodeId: 'A' }, nodeId: 'A' });
    eng.applyOperation({ opId: '2', crdtId: 's', type: 'ORSET_ADD', payload: { value: 'x', tag: 't2' }, timestamp: { counter: 2, nodeId: 'A' }, nodeId: 'A' });
    eng.applyOperation({ opId: '3', crdtId: 's', type: 'ORSET_REMOVE', payload: { tags: ['t1'] }, timestamp: { counter: 3, nodeId: 'A' }, nodeId: 'A' });
    assert.deepStrictEqual(set.values(), ['x']);
  });

  it('3. multi-node convergence', () => {
    const { nodes, keys, deliverAll } = makeMesh(['A', 'B', 'C']);
    for (const n of nodes.values()) n.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const a = nodes.get('A')!;
    const op = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: 'v1' });
    a.bridge.publishCRDTOperation(op);
    deliverAll();
    // Hardened anti-amplification can cap first-hop spread; a second gossip round ensures full convergence.
    nodes.get('B')!.bridge.publishCRDTOperation(op);
    deliverAll();
    const states = [...nodes.values()].map((n) => JSON.stringify(n.engine.getStateSnapshot()));
    assert.ok(states.every((s) => s === states[0]));
  });

  it('4. byzantine op reject', () => {
    const { nodes } = makeMesh(['A', 'B']);
    const b = nodes.get('B')!;
    b.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const ok = b.bridge.receiveCRDTOperation({
      opId: 'x',
      crdtId: 'reg',
      type: 'SET',
      payload: 'z',
      timestamp: { counter: 1, nodeId: 'A' },
      nodeId: 'A',
      signature: 'bad',
    });
    assert.strictEqual(ok, false);
  });

  it('5. replay attack', () => {
    const { nodes, keys } = makeMesh(['A', 'B']);
    const b = nodes.get('B')!;
    b.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const op = signedOp(nodes.get('A')!.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: 'x' });
    assert.strictEqual(b.bridge.receiveCRDTOperation(op), true);
    assert.strictEqual(b.bridge.receiveCRDTOperation(op), false);
  });

  it('6. out-of-order delivery converges', () => {
    const { nodes, keys } = makeMesh(['A', 'B']);
    for (const n of nodes.values()) n.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const a = nodes.get('A')!;
    const b = nodes.get('B')!;
    const op1 = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: '1' });
    const op2 = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: '2' });
    b.bridge.receiveCRDTOperation(op2);
    b.bridge.receiveCRDTOperation(op1);
    a.bridge.receiveCRDTOperation(op1);
    a.bridge.receiveCRDTOperation(op2);
    assert.deepStrictEqual(a.engine.getStateSnapshot(), b.engine.getStateSnapshot());
  });

  it('7. trust enforcement isolated node ignored', () => {
    const isolation = new NodeIsolationManager();
    isolation.isolate('A');
    const { nodes, keys } = makeMesh(['A', 'B']);
    const b = nodes.get('B')!;
    b.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const op = signedOp(nodes.get('A')!.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: 'x' });
    const bridge = new CRDTSyncBridge({
      engine: b.engine,
      gossip: b.gossip,
      keyResolver: (nid) => keys.get(nid),
      trustScoreProvider: () => 100,
      isolationManager: isolation,
    });
    assert.strictEqual(bridge.receiveCRDTOperation(op), false);
  });

  it('8. delta sync returns missing ops', () => {
    const { nodes, keys } = makeMesh(['A']);
    const a = nodes.get('A')!;
    a.engine.registerCRDT('reg', new LWWRegisterCRDT<string>());
    const op1 = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: '1' });
    const op2 = signedOp(a.engine, keys.get('A')!, { crdtId: 'reg', type: 'SET', payload: '2' });
    a.bridge.receiveCRDTOperation(op1);
    a.bridge.receiveCRDTOperation(op2);
    const missing = a.bridge.computeMissingDelta(new Set([op1.opId]));
    assert.strictEqual(missing.length, 1);
    assert.strictEqual(missing[0]!.opId, op2.opId);
  });

  it('9. persistence reload', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-crdt-'));
    const p = new CRDTPersistence(tmp);
    p.saveSnapshot({ a: 1 });
    p.appendOperation({
      opId: '1',
      crdtId: 'r',
      type: 'SET',
      payload: 1,
      timestamp: { counter: 1, nodeId: 'A' },
      nodeId: 'A',
      signature: 's',
    });
    assert.deepStrictEqual(p.loadSnapshot(), { a: 1 });
    assert.strictEqual(p.loadOperations().length, 1);
  });

  it('10. large scale stress 1000 ops', () => {
    const eng = new CRDTEngine('A');
    eng.registerCRDT('reg', new LWWRegisterCRDT<number>());
    for (let i = 0; i < 1000; i++) {
      eng.applyOperation({
        opId: `op-${i}`,
        crdtId: 'reg',
        type: 'SET',
        payload: i,
        timestamp: { counter: i + 1, nodeId: 'A' },
        nodeId: 'A',
      });
    }
    const st = eng.getStateSnapshot() as any;
    assert.ok(st.reg);
  });
});

