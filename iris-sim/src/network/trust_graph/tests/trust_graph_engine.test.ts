/**
 * Microstep 10D — Governance Trust Graph Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IRISGovernanceCertificateInput, AuditMetadata } from '../../../governance/certification_format/types/certificate_types.js';
import { buildIRISGovernanceCertificate } from '../../../governance/certification_format/engine/certificate_builder.js';
import { GovernanceCertificateRegistry } from '../../governance_registry/registry/governance_certificate_registry.js';
import { buildTrustGraph } from '../builder/trust_graph_builder.js';
import { generateGovernanceTrustGraph } from '../engine/governance_trust_graph_engine.js';
import { computeTrustScores } from '../scoring/trust_score_engine.js';
import { getTrustedNodes, getTrustRelationships } from '../query/trust_graph_query.js';
import { edgeExists, sortEdgesDeterministically } from '../utils/graph_utils.js';
import type { TrustNode, TrustEdge } from '../types/trust_graph_types.js';

function makeAttestation(attestation_hash: string) {
  return Object.freeze({
    attestation_id: 'aid-' + attestation_hash.slice(0, 8),
    proof: Object.freeze({
      proof_id: 'pid',
      governance_snapshot_hash: 'gsh',
      policy_enforcement_hash: 'peh',
      adaptation_hash: 'ah',
      runtime_decision_hash: 'rdh',
      final_proof_hash: 'fph',
      timestamp: 1000,
    }),
    governance_tier: 'TIER_2',
    autonomy_level: 'standard',
    allowed_features: Object.freeze(['a', 'b']),
    audit_multiplier: 1,
    safety_constraint_level: 1,
    decision_allowed: true,
    attestation_hash,
    timestamp: 2000,
  });
}

function makeTrustIndexReport(trust_score: number, trust_index_hash: string) {
  return Object.freeze({
    telemetry_hash: 'th',
    anomaly_hash: 'ah',
    safety_proof_hash: 'sph',
    trust_score,
    breakdown: Object.freeze({
      telemetry_score: 80,
      anomaly_score: 90,
      safety_score: 85,
    }),
    trust_index_hash,
  });
}

function makeCertificateInput(overrides?: Partial<{
  trust_index_hash: string;
  safety_proof_hash: string;
  audit_metadata: AuditMetadata;
}>): IRISGovernanceCertificateInput {
  const attestation_hash = 'ath1';
  const trust_index_hash = overrides?.trust_index_hash ?? 'tih1';
  const safety_proof_hash = overrides?.safety_proof_hash ?? 'sph1';
  return {
    attestation: makeAttestation(attestation_hash),
    trust_index_report: makeTrustIndexReport(75, trust_index_hash),
    safety_proof_hash,
    audit_metadata: overrides?.audit_metadata ?? Object.freeze({ log: 'test' }),
    versioning: Object.freeze({
      certificate_version: '1.0.0',
      format_version: '1.0',
      timestamp: '2025-01-15T12:00:00.000Z',
    }),
  };
}

function certWithIssuingNode(issuing_node_id: string, trust_index_hash: string, public_key = '') {
  const audit_metadata: AuditMetadata = Object.freeze({
    log: 'test',
    issuing_node_id,
    ...(public_key ? { issuing_node_public_key: public_key } : {}),
  });
  const input = makeCertificateInput({ audit_metadata, trust_index_hash });
  return buildIRISGovernanceCertificate(input);
}

const LOCAL_NODE: TrustNode = { node_id: 'local-node-id', public_key: 'local-pk' };

describe('Governance Trust Graph Engine', () => {
  it('1 — Registry vuoto → grafo vuoto', () => {
    const registry = new GovernanceCertificateRegistry();
    const graph = generateGovernanceTrustGraph(registry, LOCAL_NODE);
    assert.strictEqual(graph.nodes.size, 1);
    assert.ok(graph.nodes.has(LOCAL_NODE.node_id));
    assert.strictEqual(graph.edges.length, 0);
  });

  it('2 — Creazione nodi da certificati', () => {
    const registry = new GovernanceCertificateRegistry();
    const cert = certWithIssuingNode('node-B', 'tih-b', 'pk-b');
    registry.storeCertificate(cert);
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    assert.strictEqual(graph.nodes.size, 2);
    assert.ok(graph.nodes.has(LOCAL_NODE.node_id));
    assert.ok(graph.nodes.has('node-B'));
    assert.strictEqual(graph.nodes.get('node-B')!.public_key, 'pk-b');
  });

  it('3 — Creazione relazioni di fiducia', () => {
    const registry = new GovernanceCertificateRegistry();
    const cert = certWithIssuingNode('node-X', 'tih-x');
    registry.storeCertificate(cert);
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    assert.strictEqual(graph.edges.length, 1);
    assert.strictEqual(graph.edges[0].source_node, LOCAL_NODE.node_id);
    assert.strictEqual(graph.edges[0].target_node, 'node-X');
    assert.strictEqual(graph.edges[0].certificate_id, cert.certificate_hash);
    assert.strictEqual(graph.edges[0].reason, 'verified');
  });

  it('4 — Nessun edge duplicato', () => {
    const registry = new GovernanceCertificateRegistry();
    const cert = certWithIssuingNode('node-Y', 'tih-y');
    registry.storeCertificate(cert);
    registry.storeCertificate(cert);
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    assert.strictEqual(graph.edges.length, 1);
    const edge: TrustEdge = {
      source_node: LOCAL_NODE.node_id,
      target_node: 'node-Y',
      certificate_id: cert.certificate_hash,
      reason: 'verified',
    };
    assert.strictEqual(edgeExists(graph.edges, edge), true);
  });

  it('5 — Trust score corretto', () => {
    const registry = new GovernanceCertificateRegistry();
    registry.storeCertificate(certWithIssuingNode('node-A', 'tih-a'));
    registry.storeCertificate(certWithIssuingNode('node-A', 'tih-a2'));
    registry.storeCertificate(certWithIssuingNode('node-B', 'tih-b'));
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    const scores = computeTrustScores(graph);
    const byId = new Map(scores.map((s) => [s.node_id, s.score]));
    assert.strictEqual(byId.get('node-A'), 2);
    assert.strictEqual(byId.get('node-B'), 1);
    assert.strictEqual(byId.get(LOCAL_NODE.node_id), 0);
  });

  it('6 — Ordinamento trust score', () => {
    const registry = new GovernanceCertificateRegistry();
    registry.storeCertificate(certWithIssuingNode('node-alfa', 'tih-a'));
    registry.storeCertificate(certWithIssuingNode('node-high', 'tih-h1'));
    registry.storeCertificate(certWithIssuingNode('node-high', 'tih-h2'));
    registry.storeCertificate(certWithIssuingNode('node-zeta', 'tih-z'));
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    const scores = computeTrustScores(graph);
    assert.strictEqual(scores[0].node_id, 'node-high');
    assert.strictEqual(scores[0].score, 2);
    const sameScore = scores.filter((s) => s.score === 1);
    assert.strictEqual(sameScore.length, 2);
    assert.ok(sameScore[0].node_id <= sameScore[1].node_id);
    assert.strictEqual(sameScore[0].node_id, 'node-alfa');
    assert.strictEqual(sameScore[1].node_id, 'node-zeta');
  });

  it('7 — Query relazioni nodo', () => {
    const registry = new GovernanceCertificateRegistry();
    const c1 = certWithIssuingNode('node-Q', 'tih-q1');
    const c2 = certWithIssuingNode('node-R', 'tih-r');
    registry.storeCertificate(c1);
    registry.storeCertificate(c2);
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    const localRels = getTrustRelationships(graph, LOCAL_NODE.node_id);
    assert.strictEqual(localRels.length, 2);
    const sortedByCertId = [...localRels].sort((a, b) =>
      a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0
    );
    assert.deepStrictEqual(localRels.map((e) => e.certificate_id), sortedByCertId.map((e) => e.certificate_id));
    const nodeQRels = getTrustRelationships(graph, 'node-Q');
    assert.strictEqual(nodeQRels.length, 1);
    assert.strictEqual(nodeQRels[0].target_node, 'node-Q');
  });

  it('8 — Determinismo completo', () => {
    const registry = new GovernanceCertificateRegistry();
    registry.storeCertificate(certWithIssuingNode('node-1', 'tih-1'));
    registry.storeCertificate(certWithIssuingNode('node-2', 'tih-2'));
    const graph1 = generateGovernanceTrustGraph(registry, LOCAL_NODE);
    const graph2 = generateGovernanceTrustGraph(registry, LOCAL_NODE);
    assert.strictEqual(graph1.nodes.size, graph2.nodes.size);
    assert.strictEqual(graph1.edges.length, graph2.edges.length);
    const edges1 = sortEdgesDeterministically([...graph1.edges]);
    const edges2 = sortEdgesDeterministically([...graph2.edges]);
    assert.deepStrictEqual(
      edges1.map((e) => [e.source_node, e.target_node, e.certificate_id]),
      edges2.map((e) => [e.source_node, e.target_node, e.certificate_id])
    );
    const nodes1 = getTrustedNodes(graph1).map((n) => n.node_id);
    const nodes2 = getTrustedNodes(graph2).map((n) => n.node_id);
    assert.deepStrictEqual(nodes1, nodes2);
  });
});

describe('Trust Graph utils', () => {
  it('edgeExists and sortEdgesDeterministically', () => {
    const e1: TrustEdge = { source_node: 'a', target_node: 'b', certificate_id: 'c1', reason: 'r' };
    const e2: TrustEdge = { source_node: 'a', target_node: 'b', certificate_id: 'c2', reason: 'r' };
    assert.strictEqual(edgeExists([e1], e1), true);
    assert.strictEqual(edgeExists([e1], e2), false);
    const unsorted: TrustEdge[] = [
      { source_node: 'z', target_node: 'y', certificate_id: 'id1', reason: 'r' },
      { source_node: 'a', target_node: 'b', certificate_id: 'id2', reason: 'r' },
    ];
    const sorted = sortEdgesDeterministically(unsorted);
    assert.strictEqual(sorted[0].source_node, 'a');
    assert.strictEqual(sorted[1].source_node, 'z');
  });
});

describe('getTrustedNodes', () => {
  it('returns nodes sorted by node_id', () => {
    const registry = new GovernanceCertificateRegistry();
    registry.storeCertificate(certWithIssuingNode('node-m', 'tih-m'));
    registry.storeCertificate(certWithIssuingNode('node-a', 'tih-a'));
    const graph = buildTrustGraph(registry, LOCAL_NODE);
    const nodes = getTrustedNodes(graph);
    const ids = nodes.map((n) => n.node_id);
    const expected = [LOCAL_NODE.node_id, 'node-a', 'node-m'].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepStrictEqual(ids, expected);
  });
});
