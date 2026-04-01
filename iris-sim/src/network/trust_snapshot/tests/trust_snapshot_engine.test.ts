/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTrustGraph, TrustNode, TrustScore } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import type { SnapshotInput } from '../types/trust_snapshot_types.js';
import { buildTrustSnapshot } from '../builder/trust_snapshot_builder.js';
import {
  hashTrustGraph,
  hashPolicies,
  hashDecisions,
  computeGlobalSnapshotHash,
} from '../hashing/snapshot_hash_engine.js';
import { auditTrustSnapshot } from '../audit/snapshot_audit_engine.js';
import { getSnapshotHash, verifySnapshot } from '../query/snapshot_query_api.js';
import { normalizeArray, serializeDeterministic } from '../utils/snapshot_utils.js';

function makeGraph(
  nodes: TrustNode[],
  edges: { source: string; target: string; cert_id: string }[]
): GovernanceTrustGraph {
  const nodeMap = new Map<string, TrustNode>();
  for (const n of nodes) nodeMap.set(n.node_id, n);
  const edgeList = edges.map((e) => ({
    source_node: e.source,
    target_node: e.target,
    certificate_id: e.cert_id,
    reason: 'verified',
  }));
  return Object.freeze({ nodes: new Map(nodeMap), edges: edgeList });
}

const FIXED_TS = 1000000;

describe('Governance Trust Snapshot Engine', () => {
  it('1 — Creazione snapshot valida', () => {
    const graph = makeGraph(
      [{ node_id: 'n1', public_key: 'pk1' }],
      []
    );
    const input: SnapshotInput = {
      trust_graph: graph,
      trust_scores: [{ node_id: 'n1', score: 0 }],
      policies: [],
      decisions: [],
      timestamp: FIXED_TS,
    };
    const snapshot = buildTrustSnapshot(input);
    assert.strictEqual(typeof snapshot.snapshot_id, 'string');
    assert.strictEqual(snapshot.snapshot_id.length > 0, true);
    assert.strictEqual(snapshot.timestamp, FIXED_TS);
    assert.strictEqual(typeof snapshot.trust_graph_hash, 'string');
    assert.strictEqual(typeof snapshot.policy_hash, 'string');
    assert.strictEqual(typeof snapshot.decision_hash, 'string');
    assert.strictEqual(typeof snapshot.global_hash, 'string');
    assert.strictEqual(snapshot.snapshot_id, snapshot.global_hash);
  });

  it('2 — Hash trust graph corretto', () => {
    const graph1 = makeGraph(
      [{ node_id: 'a', public_key: 'pk' }],
      []
    );
    const graph2 = makeGraph(
      [{ node_id: 'a', public_key: 'pk' }],
      []
    );
    const h1 = hashTrustGraph(graph1);
    const h2 = hashTrustGraph(graph2);
    assert.strictEqual(h1, h2);
    const graph3 = makeGraph(
      [{ node_id: 'b', public_key: 'pk' }],
      []
    );
    const h3 = hashTrustGraph(graph3);
    assert.notStrictEqual(h1, h3);
  });

  it('3 — Hash policy corretto', () => {
    const policies: TrustPolicy[] = [
      { policy_id: 'p1', minimum_trust_score: 1, require_independent_attestations: 1 },
    ];
    const h1 = hashPolicies(policies);
    const h2 = hashPolicies([...policies]);
    assert.strictEqual(h1, h2);
    const h3 = hashPolicies([
      { policy_id: 'p2', minimum_trust_score: 0, require_independent_attestations: 0 },
    ]);
    assert.notStrictEqual(h1, h3);
  });

  it('4 — Hash decisioni corretto', () => {
    const decisions: TrustDecision[] = [
      { node_id: 'n1', decision: 'ACCEPT', policy_id: 'pol-1' },
    ];
    const h1 = hashDecisions(decisions);
    const h2 = hashDecisions([...decisions]);
    assert.strictEqual(h1, h2);
  });

  it('5 — Hash globale deterministico', () => {
    const gh1 = computeGlobalSnapshotHash('h1', 'h2', 'h3', FIXED_TS);
    const gh2 = computeGlobalSnapshotHash('h1', 'h2', 'h3', FIXED_TS);
    assert.strictEqual(gh1, gh2);
    const gh3 = computeGlobalSnapshotHash('h1', 'h2', 'h3', FIXED_TS + 1);
    assert.notStrictEqual(gh1, gh3);
  });

  it('6 — Audit snapshot valido', () => {
    const graph = makeGraph(
      [{ node_id: 'x', public_key: 'pk' }],
      []
    );
    const input: SnapshotInput = {
      trust_graph: graph,
      trust_scores: [{ node_id: 'x', score: 0 }],
      policies: [],
      decisions: [],
      timestamp: FIXED_TS,
    };
    const snapshot = buildTrustSnapshot(input);
    const result = auditTrustSnapshot(snapshot, input);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.recomputed_hash, snapshot.global_hash);
    assert.strictEqual(result.snapshot_id, snapshot.snapshot_id);
  });

  it('7 — Audit snapshot invalido se input modificato', () => {
    const graph = makeGraph(
      [{ node_id: 'a', public_key: 'pk' }],
      []
    );
    const input: SnapshotInput = {
      trust_graph: graph,
      trust_scores: [],
      policies: [],
      decisions: [],
      timestamp: FIXED_TS,
    };
    const snapshot = buildTrustSnapshot(input);
    const modifiedInput: SnapshotInput = {
      trust_graph: makeGraph([{ node_id: 'b', public_key: 'pk' }], []),
      trust_scores: [],
      policies: [],
      decisions: [],
      timestamp: FIXED_TS,
    };
    const result = auditTrustSnapshot(snapshot, modifiedInput);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.recomputed_hash !== snapshot.global_hash, true);
  });

  it('8 — Query API funzionante', () => {
    const graph = makeGraph(
      [{ node_id: 'q', public_key: 'pk' }],
      []
    );
    const input: SnapshotInput = {
      trust_graph: graph,
      trust_scores: [],
      policies: [],
      decisions: [],
      timestamp: FIXED_TS,
    };
    const snapshot = buildTrustSnapshot(input);
    const hash = getSnapshotHash(snapshot);
    assert.strictEqual(hash, snapshot.global_hash);
    assert.strictEqual(verifySnapshot(snapshot, input), true);
    assert.strictEqual(
      verifySnapshot(snapshot, { ...input, trust_graph: makeGraph([], []) }),
      false
    );
  });

  it('9 — Serializzazione deterministica', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const s1 = serializeDeterministic(obj);
    const s2 = serializeDeterministic(obj);
    assert.strictEqual(s1, s2);
    assert.ok(s1.includes('"a":2'));
    const arr = [3, 1, 2];
    const sorted = normalizeArray(arr);
    assert.deepStrictEqual(sorted, [1, 2, 3]);
  });

  it('10 — Determinismo completo: stesso input → stesso snapshot hash', () => {
    const graph = makeGraph(
      [
        { node_id: 'n1', public_key: 'pk1' },
        { node_id: 'n2', public_key: 'pk2' },
      ],
      [{ source: 'n1', target: 'n2', cert_id: 'c1' }]
    );
    const scores: TrustScore[] = [
      { node_id: 'n1', score: 0 },
      { node_id: 'n2', score: 1 },
    ];
    const policies: TrustPolicy[] = [
      { policy_id: 'pol-a', minimum_trust_score: 0, require_independent_attestations: 0 },
    ];
    const decisions: TrustDecision[] = [
      { node_id: 'n2', decision: 'ACCEPT', policy_id: 'pol-a' },
    ];
    const input: SnapshotInput = {
      trust_graph: graph,
      trust_scores: scores,
      policies,
      decisions,
      timestamp: FIXED_TS,
    };
    const snapshot1 = buildTrustSnapshot(input);
    const snapshot2 = buildTrustSnapshot(input);
    assert.strictEqual(snapshot1.global_hash, snapshot2.global_hash);
    assert.strictEqual(snapshot1.snapshot_id, snapshot2.snapshot_id);
    assert.strictEqual(snapshot1.trust_graph_hash, snapshot2.trust_graph_hash);
    assert.strictEqual(snapshot1.policy_hash, snapshot2.policy_hash);
    assert.strictEqual(snapshot1.decision_hash, snapshot2.decision_hash);
  });
});
