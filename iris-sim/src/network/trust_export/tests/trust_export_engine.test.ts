/**
 * Microstep 10I — Governance Trust Export Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTrustGraph, TrustNode, TrustScore } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import { buildTrustSnapshot } from '../../trust_snapshot/builder/trust_snapshot_builder.js';
import type { SnapshotInput } from '../../trust_snapshot/types/trust_snapshot_types.js';
import { buildGovernanceExportPackage } from '../builder/export_package_builder.js';
import { computeExportHash } from '../hashing/export_hash_engine.js';
import { generateExportMetadata } from '../metadata/export_metadata_engine.js';
import { validateExportPackage } from '../validation/export_validation_engine.js';
import { getExportHash, verifyExportPackage, getExportMetadata } from '../query/export_query_api.js';

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
const NODE_ID = 'node-export-test';

function makeSnapshot(
  graph: GovernanceTrustGraph,
  scores: TrustScore[],
  policies: TrustPolicy[],
  decisions: TrustDecision[]
) {
  const input: SnapshotInput = {
    trust_graph: graph,
    trust_scores: scores,
    policies,
    decisions,
    timestamp: FIXED_TS,
  };
  return buildTrustSnapshot(input);
}

describe('Governance Trust Export Engine', () => {
  it('1 — Creazione export package', () => {
    const graph = makeGraph([{ node_id: 'n1', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'n1', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const pkg = buildGovernanceExportPackage(
      NODE_ID,
      snapshot,
      graph,
      [],
      [],
      metadata,
      FIXED_TS
    );
    assert.strictEqual(pkg.node_id, NODE_ID);
    assert.strictEqual(pkg.export_timestamp, FIXED_TS);
    assert.strictEqual(pkg.snapshot, snapshot);
    assert.strictEqual(pkg.trust_graph, graph);
    assert.strictEqual(pkg.policies.length, 0);
    assert.strictEqual(pkg.decisions.length, 0);
    assert.strictEqual(typeof pkg.export_hash, 'string');
    assert.strictEqual(pkg.export_hash.length > 0, true);
  });

  it('2 — Hash export deterministico', () => {
    const graph = makeGraph([{ node_id: 'a', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'a', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const h1 = computeExportHash(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    const h2 = computeExportHash(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    assert.strictEqual(h1, h2);
  });

  it('3 — Metadata generati correttamente', () => {
    const metadata = generateExportMetadata();
    assert.strictEqual(typeof metadata.export_version, 'string');
    assert.strictEqual(metadata.export_version.length > 0, true);
    assert.strictEqual(typeof metadata.iris_version, 'string');
    assert.ok(Array.isArray(metadata.exported_components));
    assert.ok(metadata.exported_components.includes('snapshot'));
    assert.ok(metadata.exported_components.includes('trust_graph'));
    assert.ok(metadata.exported_components.includes('policies'));
    assert.ok(metadata.exported_components.includes('decisions'));
  });

  it('4 — Validazione pacchetto valido', () => {
    const graph = makeGraph([{ node_id: 'n', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'n', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const pkg = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    const result = validateExportPackage(pkg);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.recomputed_hash, pkg.export_hash);
  });

  it('5 — Pacchetto modificato → invalidazione', () => {
    const graph = makeGraph([{ node_id: 'n', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'n', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const pkg = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    const tampered = {
      ...pkg,
      node_id: 'other-node',
    };
    const result = validateExportPackage(tampered);
    assert.strictEqual(result.valid, false);
    assert.notStrictEqual(result.recomputed_hash, tampered.export_hash);
  });

  it('6 — Serializzazione deterministica', () => {
    const graph = makeGraph([{ node_id: 'x', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'x', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const pkg1 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    const pkg2 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    assert.strictEqual(pkg1.export_hash, pkg2.export_hash);
  });

  it('7 — Query API funzionante', () => {
    const graph = makeGraph([{ node_id: 'q', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'q', score: 0 }], [], []);
    const metadata = generateExportMetadata();
    const pkg = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    assert.strictEqual(getExportHash(pkg), pkg.export_hash);
    assert.strictEqual(verifyExportPackage(pkg), true);
    const meta = getExportMetadata(pkg);
    assert.strictEqual(meta.export_version, metadata.export_version);
    assert.strictEqual(meta.iris_version, metadata.iris_version);
  });

  it('8 — Array normalizzati correttamente', () => {
    const graph = makeGraph([{ node_id: 'n', public_key: 'pk' }], []);
    const snapshot = makeSnapshot(graph, [{ node_id: 'n', score: 0 }], [], []);
    const policies: TrustPolicy[] = [
      { policy_id: 'pol-b', minimum_trust_score: 0, require_independent_attestations: 0 },
      { policy_id: 'pol-a', minimum_trust_score: 1, require_independent_attestations: 1 },
    ];
    const decisions: TrustDecision[] = [
      { node_id: 'n2', decision: 'ACCEPT', policy_id: 'pol' },
      { node_id: 'n1', decision: 'REJECT', policy_id: 'pol' },
    ];
    const metadata = generateExportMetadata();
    const pkg1 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, policies, decisions, metadata, FIXED_TS);
    const pkg2 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [...policies].reverse(), [...decisions].reverse(), metadata, FIXED_TS);
    assert.strictEqual(pkg1.export_hash, pkg2.export_hash);
  });

  it('9 — Export con dati minimi', () => {
    const graph = makeGraph([], []);
    const snapshot = makeSnapshot(graph, [], [], []);
    const metadata = generateExportMetadata();
    const pkg = buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
    assert.strictEqual(pkg.trust_graph.nodes.size, 0);
    assert.strictEqual(pkg.trust_graph.edges.length, 0);
    assert.strictEqual(pkg.policies.length, 0);
    assert.strictEqual(pkg.decisions.length, 0);
    assert.strictEqual(validateExportPackage(pkg).valid, true);
  });

  it('10 — Stesso input → stesso export hash', () => {
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
      { policy_id: 'pol-1', minimum_trust_score: 0, require_independent_attestations: 0 },
    ];
    const decisions: TrustDecision[] = [
      { node_id: 'n2', decision: 'ACCEPT', policy_id: 'pol-1' },
    ];
    const snapshot = makeSnapshot(graph, scores, policies, decisions);
    const metadata = generateExportMetadata();
    const pkg1 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, policies, decisions, metadata, FIXED_TS);
    const pkg2 = buildGovernanceExportPackage(NODE_ID, snapshot, graph, policies, decisions, metadata, FIXED_TS);
    assert.strictEqual(pkg1.export_hash, pkg2.export_hash);
    assert.strictEqual(pkg1.node_id, pkg2.node_id);
    assert.strictEqual(pkg1.export_timestamp, pkg2.export_timestamp);
  });
});
