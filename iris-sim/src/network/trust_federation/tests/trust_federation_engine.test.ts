/**
 * Microstep 10K — Governance Trust Federation Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTrustGraph, TrustNode } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy } from '../../trust_policy/types/trust_policy_types.js';
import { buildTrustSnapshot } from '../../trust_snapshot/builder/trust_snapshot_builder.js';
import { buildGovernanceExportPackage } from '../../trust_export/builder/export_package_builder.js';
import { generateExportMetadata } from '../../trust_export/metadata/export_metadata_engine.js';
import { buildFederatedTrustGraph } from '../builder/federation_graph_builder.js';
import { computeFederatedTrustScores } from '../scoring/federation_trust_scoring_engine.js';
import { resolveFederationPolicies } from '../policy/federation_policy_resolver.js';
import { createFederationSnapshot } from '../snapshot/federation_snapshot_engine.js';
import { buildFederation } from '../engine/trust_federation_engine.js';
import {
  getFederatedNodes,
  getFederatedEdges,
  getFederationSnapshotHash,
} from '../query/federation_query_api.js';

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

function makeExportPackage(node_id: string, graph: GovernanceTrustGraph, policies: TrustPolicy[] = []) {
  const snapshot = buildTrustSnapshot({
    trust_graph: graph,
    trust_scores: [],
    policies,
    decisions: [],
    timestamp: FIXED_TS,
  });
  const metadata = generateExportMetadata();
  return buildGovernanceExportPackage(node_id, snapshot, graph, policies, [], metadata, FIXED_TS);
}

describe('Governance Trust Federation Engine', () => {
  it('1 — Federation con solo nodo locale', () => {
    const local = makeGraph([{ node_id: 'local-1', public_key: 'pk' }], []);
    const snapshot = buildFederation(local, [], [], FIXED_TS);
    assert.strictEqual(snapshot.graph.nodes.length, 1);
    assert.strictEqual(snapshot.graph.nodes[0].node_id, 'local-1');
    assert.strictEqual(snapshot.graph.edges.length, 0);
  });

  it('2 — Federation con due nodi', () => {
    const local = makeGraph(
      [
        { node_id: 'a', public_key: 'pk-a' },
        { node_id: 'b', public_key: 'pk-b' },
      ],
      [{ source: 'a', target: 'b', cert_id: 'c1' }]
    );
    const snapshot = buildFederation(local, [], [], FIXED_TS);
    assert.strictEqual(snapshot.graph.nodes.length, 2);
    assert.strictEqual(snapshot.graph.edges.length, 1);
    const nodeB = snapshot.graph.nodes.find((n) => n.node_id === 'b');
    assert.ok(nodeB);
    assert.strictEqual(nodeB!.trust_score, 1);
  });

  it('3 — Merge trust graph', () => {
    const local = makeGraph([{ node_id: 'local', public_key: 'pk' }], []);
    const pkgGraph = makeGraph(
      [
        { node_id: 'remote', public_key: 'pk-r' },
      ],
      []
    );
    const pkg = makeExportPackage('remote-node', pkgGraph);
    const fed = buildFederatedTrustGraph(local, [pkg]);
    assert.strictEqual(fed.nodes.length, 2);
    assert.ok(fed.nodes.some((n) => n.node_id === 'local'));
    assert.ok(fed.nodes.some((n) => n.node_id === 'remote'));
  });

  it('4 — Calcolo trust score federato', () => {
    const graph = buildFederatedTrustGraph(
      makeGraph(
        [
          { node_id: 'x', public_key: 'pk' },
          { node_id: 'y', public_key: 'pk' },
        ],
        [
          { source: 'x', target: 'y', cert_id: 'c1' },
          { source: 'x', target: 'y', cert_id: 'c2' },
        ]
      ),
      []
    );
    const scored = computeFederatedTrustScores(graph);
    const nodeY = scored.nodes.find((n) => n.node_id === 'y');
    assert.ok(nodeY);
    assert.strictEqual(nodeY!.trust_score, 2);
  });

  it('5 — Risoluzione policy', () => {
    const localPol: TrustPolicy = {
      policy_id: 'pol-local',
      minimum_trust_score: 0,
      require_independent_attestations: 0,
    };
    const pkgGraph = makeGraph([{ node_id: 'n', public_key: 'pk' }], []);
    const pkgPol: TrustPolicy = {
      policy_id: 'pol-imported',
      minimum_trust_score: 1,
      require_independent_attestations: 1,
    };
    const pkg = makeExportPackage('other', pkgGraph, [pkgPol]);
    const resolved = resolveFederationPolicies([localPol], [pkg]);
    assert.strictEqual(resolved.length, 2);
    const ids = resolved.map((p) => p.policy_id).sort();
    assert.deepStrictEqual(ids, ['pol-imported', 'pol-local']);
  });

  it('6 — Creazione snapshot federato', () => {
    const snapshot = createFederationSnapshot(
      { nodes: [{ node_id: 'n', trust_score: 0 }], edges: [] },
      FIXED_TS
    );
    assert.strictEqual(typeof snapshot.federation_id, 'string');
    assert.strictEqual(snapshot.timestamp, FIXED_TS);
    assert.strictEqual(snapshot.snapshot_hash, snapshot.federation_id);
  });

  it('7 — Hash snapshot deterministico', () => {
    const graph = Object.freeze({
      nodes: Object.freeze([{ node_id: 'a', trust_score: 1 }]),
      edges: Object.freeze([]),
    });
    const s1 = createFederationSnapshot(graph, FIXED_TS);
    const s2 = createFederationSnapshot(graph, FIXED_TS);
    assert.strictEqual(s1.snapshot_hash, s2.snapshot_hash);
  });

  it('8 — Query nodi federati', () => {
    const local = makeGraph(
      [
        { node_id: 'p', public_key: 'pk' },
        { node_id: 'q', public_key: 'pk' },
      ],
      [{ source: 'p', target: 'q', cert_id: 'c' }]
    );
    const snapshot = buildFederation(local, [], [], FIXED_TS);
    const nodes = getFederatedNodes(snapshot);
    assert.strictEqual(nodes.length, 2);
    assert.ok(nodes.some((n) => n.node_id === 'p'));
    assert.ok(nodes.some((n) => n.node_id === 'q'));
  });

  it('9 — Query edge federati', () => {
    const local = makeGraph(
      [
        { node_id: 'a', public_key: 'pk' },
        { node_id: 'b', public_key: 'pk' },
      ],
      [{ source: 'a', target: 'b', cert_id: 'c1' }]
    );
    const snapshot = buildFederation(local, [], [], FIXED_TS);
    const edges = getFederatedEdges(snapshot);
    assert.strictEqual(edges.length, 1);
    assert.strictEqual(edges[0].source_node, 'a');
    assert.strictEqual(edges[0].target_node, 'b');
    assert.strictEqual(edges[0].weight, 1);
  });

  it('10 — Stesso input → stesso federation snapshot', () => {
    const local = makeGraph(
      [
        { node_id: 'x', public_key: 'pk' },
        { node_id: 'y', public_key: 'pk' },
      ],
      [{ source: 'x', target: 'y', cert_id: 'c' }]
    );
    const s1 = buildFederation(local, [], [], FIXED_TS);
    const s2 = buildFederation(local, [], [], FIXED_TS);
    assert.strictEqual(s1.snapshot_hash, s2.snapshot_hash);
    assert.strictEqual(s1.federation_id, s2.federation_id);
    assert.strictEqual(getFederationSnapshotHash(s1), getFederationSnapshotHash(s2));
  });
});
