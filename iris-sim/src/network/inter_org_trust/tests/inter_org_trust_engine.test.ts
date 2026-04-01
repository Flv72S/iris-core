/**
 * Phase 11D — Inter-Organizational Trust Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runInterOrgTrustEngine,
  computeTrustIndices,
  computeDeclaredTrust,
  computeObservedTrust,
  computeVerifiedTrust,
  verifyCertificateAttestations,
  generateTrustProof,
  buildFederatedTrustReport,
  calculateReportHash,
  verifyFederatedTrustReport,
  type NodeTrustIndex,
  type InterOrgTrustEngineParams,
} from '../index.js';
import {
  createEmptyRegistry,
  registerTrustAnchor,
  registerFederatedNode,
  getNodeMetadataForConsensus,
  computeCertificateHash,
  type GovernanceCertificate,
  type TrustAnchor,
  type FederatedNodeRecordRegistrationInput,
} from '../../federated_node_registry/index.js';
import type { NodeTrustScore } from '../../cross_tenant_sla/trust/sla_trust_types.js';
import type { SLAConsensusCheckResult } from '../../cross_tenant_sla/verification/sla_consensus_types.js';

function makeCertificate(overrides: Partial<GovernanceCertificate> & { issued_to_node: string; issuer: string }): GovernanceCertificate {
  const base = {
    certificate_id: 'cert-' + overrides.issued_to_node,
    issuer: overrides.issuer,
    issued_to_node: overrides.issued_to_node,
    public_key: 'pk-' + overrides.issued_to_node,
    signature: 'sig-' + overrides.issued_to_node,
    issued_at: overrides.issued_at ?? 1000,
    expires_at: overrides.expires_at ?? 100000,
    certificate_hash: '',
  };
  const full = { ...base, ...overrides };
  const hash = computeCertificateHash(full);
  return Object.freeze({ ...full, certificate_hash: overrides.certificate_hash ?? hash });
}

function makeTrustAnchor(id: string, organization: string): TrustAnchor {
  return Object.freeze({
    trust_anchor_id: id,
    organization,
    root_public_key: 'root-' + id,
    signature: 'sig-' + id,
    issued_at: 1000,
    trust_level: 1,
  });
}

function makeNodeRecord(
  node_id: string,
  cert: GovernanceCertificate,
  trust_anchor_id: string,
  overrides?: Partial<FederatedNodeRecordRegistrationInput>
): FederatedNodeRecordRegistrationInput {
  return Object.freeze({
    node_id,
    node_name: 'node-' + node_id,
    organization_id: 'org1',
    protocol_version: '1.0',
    governance_role: 'participant',
    trust_anchor_id,
    certificate: cert,
    node_status: 'active',
    registration_timestamp: 2000,
    last_update_timestamp: 2000,
    ...overrides,
  });
}

function trustScore(node_id: string, trust_score: number): NodeTrustScore {
  return Object.freeze({ node_id, trust_score, trust_source: 'test' });
}

function slaConsensus(consensusNodes: string[], slaNodes: string[], missing: string[], outside: string[], status: 'OK' | 'WARNING' | 'ERROR'): SLAConsensusCheckResult {
  return Object.freeze({
    consensus_hash: 'chash',
    consensus_nodes: [...consensusNodes].sort((a, b) => a.localeCompare(b)),
    sla_nodes: [...slaNodes].sort((a, b) => a.localeCompare(b)),
    nodes_missing_sla: [...missing].sort((a, b) => a.localeCompare(b)),
    nodes_outside_consensus: [...outside].sort((a, b) => a.localeCompare(b)),
    mismatch_ratio: status === 'OK' ? 0 : 0.5,
    verification_status: status,
  });
}

function useSlaConsensus(): SLAConsensusCheckResult {
  return slaConsensus(['n1', 'n2'], ['n1'], ['n2'], [], 'WARNING');
}

describe('Inter-Org Trust Engine', () => {
  it('Deterministic trust index: same inputs → same NodeTrustIndex[]', () => {
    const meta = getNodeMetadataForConsensus(
      (() => {
        let r = createEmptyRegistry();
        r = registerTrustAnchor(r, makeTrustAnchor('ta1', 'org1'));
        r = registerFederatedNode(r, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
        r = registerFederatedNode(r, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
        return r;
      })()
    );
    const scores: NodeTrustScore[] = [trustScore('n1', 0.8), trustScore('n2', 0.6)];
    const a = computeTrustIndices(meta, scores, null);
    const b = computeTrustIndices(meta, scores, null);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.ok(a.length === 2);
    assert.ok(a.every((n) => n.trust_index >= 0 && n.trust_index <= 1));
    assert.ok(a.every((n) => ['HIGH', 'MEDIUM', 'LOW', 'UNTRUSTED'].includes(n.trust_level)));
  });

  it('Trust index normalized to [0,1] and uses trust score', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const indices = computeTrustIndices(meta, [trustScore('n1', 0.9)], null);
    assert.strictEqual(indices.length, 1);
    assert.strictEqual(indices[0].node_id, 'n1');
    assert.ok(indices[0].trust_index >= 0.77 && indices[0].trust_index <= 0.78);
  });

  it('Certificate attestation verification: valid node → valid result', () => {
    let registry = createEmptyRegistry();
    const ta = makeTrustAnchor('ta1', 'org1');
    registry = registerTrustAnchor(registry, ta);
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const nodes = registry.nodes;
    const results = verifyCertificateAttestations(nodes, registry.trust_anchors, 5000);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].node_id, 'n1');
    assert.strictEqual(results[0].valid, true);
    assert.strictEqual(results[0].certificate_valid, true);
    assert.strictEqual(results[0].commitment_verified, true);
    assert.strictEqual(results[0].trust_anchor_associated, true);
  });

  it('Trust proof integrity: trust_hash is deterministic', () => {
    const indices: NodeTrustIndex[] = [
      Object.freeze({ node_id: 'n1', organization_id: 'org1', declared_trust: 0.8, observed_trust: 1, verified_trust: 1, trust_index: 0.9, trust_level: 'HIGH' }),
      Object.freeze({ node_id: 'n2', organization_id: 'org1', declared_trust: 0.6, observed_trust: 1, verified_trust: 1, trust_index: 0.72, trust_level: 'HIGH' }),
    ];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
      Object.freeze({ node_id: 'n2', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const proof1 = generateTrustProof(indices, attestations, 1000);
    const proof2 = generateTrustProof(indices, attestations, 1000);
    assert.strictEqual(proof1.trust_hash, proof2.trust_hash);
    assert.strictEqual(proof1.timestamp, 1000);
    assert.ok(proof1.evaluated_nodes.indexOf('n1') >= 0);
    assert.strictEqual(proof1.trust_summary.total_nodes, 2);
    assert.strictEqual(proof1.trust_summary.valid_attestation_count, 2);
    assert.strictEqual(proof1.trust_summary.highest_trust_node, 'n1');
    assert.strictEqual(proof1.trust_summary.lowest_trust_node, 'n2');
    assert.strictEqual(proof1.trust_summary.verified_node_count, 2);
    assert.ok(proof1.trust_summary.average_trust_index >= 0.79 && proof1.trust_summary.average_trust_index <= 0.83);
  });

  it('Report hash determinism: same payload → same report_hash', () => {
    const indices: NodeTrustIndex[] = [
      Object.freeze({ node_id: 'n1', organization_id: 'org1', declared_trust: 0.7, observed_trust: 0.75, verified_trust: 0.5, trust_index: 0.675, trust_level: 'MEDIUM' }),
    ];
    const attestations = [Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true })];
    const proof = generateTrustProof(indices, attestations, 2000);
    const report1 = buildFederatedTrustReport(indices, attestations, proof);
    const report2 = buildFederatedTrustReport(indices, attestations, proof);
    assert.strictEqual(report1.report_hash, report2.report_hash);
    const recomputed = calculateReportHash({ node_trust_indices: report1.node_trust_indices, attestation_results: report1.attestation_results, trust_proof: report1.trust_proof });
    assert.strictEqual(recomputed, report1.report_hash);
  });

  it('verifyFederatedTrustReport: unmodified report returns true', () => {
    const indices: NodeTrustIndex[] = [
      Object.freeze({ node_id: 'n1', organization_id: '', declared_trust: 0.5, observed_trust: 0.75, verified_trust: 0.4, trust_index: 0.553, trust_level: 'MEDIUM' }),
    ];
    const attestations = [Object.freeze({ node_id: 'n1', valid: false, certificate_valid: true, commitment_verified: false, trust_anchor_associated: true })];
    const proof = generateTrustProof(indices, attestations, 3000);
    const report = buildFederatedTrustReport(indices, attestations, proof);
    assert.strictEqual(verifyFederatedTrustReport(report), true);
  });

  it('Full engine integration: report contains indices, attestations, proof, report_hash', () => {
    let registry = createEmptyRegistry();
    const ta = makeTrustAnchor('ta1', 'org1');
    registry = registerTrustAnchor(registry, ta);
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const trustScores: NodeTrustScore[] = [trustScore('n1', 0.8), trustScore('n2', 0.6)];
    const params: InterOrgTrustEngineParams = {
      nodeMetadata: meta,
      trustScores,
      nodeRecords: registry.nodes,
      trustAnchors: registry.trust_anchors,
      timestamp: 5000,
    };
    const report = runInterOrgTrustEngine(params);
    assert.ok(report.node_trust_indices.length === 2);
    assert.ok(report.attestation_results.length === 2);
    assert.ok(report.trust_proof.trust_hash.length > 0);
    assert.ok(report.report_hash.length > 0);
    assert.strictEqual(verifyFederatedTrustReport(report), true);
  });

  it('Trust index with SLA consensus: node in nodes_missing_sla gets penalty', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const scores: NodeTrustScore[] = [trustScore('n1', 0.8), trustScore('n2', 0.8)];
    const consensus = useSlaConsensus();
    const indices = computeTrustIndices(meta, scores, consensus);
    const n1 = indices.find((i) => i.node_id === 'n1');
    const n2 = indices.find((i) => i.node_id === 'n2');
    assert.ok(n1 && n1.observed_trust === 1 && Math.abs(n1.trust_index - 0.8) < 1e-6);
    assert.ok(n2 && n2.observed_trust === 0.25 && Math.abs(n2.trust_index - 0.575) < 1e-6);
    assert.strictEqual(n2!.trust_level, 'LOW');
  });

  it('Full engine without nodeRecords: attestation_results empty, report still valid', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const report = runInterOrgTrustEngine({
      nodeMetadata: meta,
      trustScores: [trustScore('n1', 0.7)],
      timestamp: 6000,
    });
    assert.strictEqual(report.attestation_results.length, 0);
    assert.strictEqual(report.node_trust_indices.length, 1);
    assert.strictEqual(verifyFederatedTrustReport(report), true);
  });

  it('Multi-component trust: declared 0.8, observed 1, verified 1 → trust_index 0.9', () => {
    assert.strictEqual(computeDeclaredTrust('n1', [trustScore('n1', 0.8)]), 0.8);
    assert.strictEqual(computeObservedTrust('n1', null), 0.75);
    assert.strictEqual(computeObservedTrust('n1', slaConsensus(['n1', 'n2'], ['n1', 'n2'], [], [], 'OK')), 1);
    const att = [Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true })];
    assert.strictEqual(computeVerifiedTrust('n1', att), 1);
    const meta = [{ node_id: 'n1' }];
    const indices = computeTrustIndices(meta, [trustScore('n1', 0.8)], slaConsensus(['n1'], ['n1'], [], [], 'OK'), att);
    assert.strictEqual(indices.length, 1);
    assert.strictEqual(indices[0].declared_trust, 0.8);
    assert.strictEqual(indices[0].observed_trust, 1);
    assert.strictEqual(indices[0].verified_trust, 1);
    assert.ok(Math.abs(indices[0].trust_index - 0.9) < 1e-6);
    assert.strictEqual(indices[0].trust_level, 'HIGH');
  });

  it('SLA penalty: node in nodes_missing_sla reduces trust_index', () => {
    const consensus = slaConsensus(['n1', 'n2'], ['n1'], ['n2'], [], 'WARNING');
    assert.strictEqual(computeObservedTrust('n2', consensus), 0.25);
    const meta = [{ node_id: 'n2' }];
    const indices = computeTrustIndices(meta, [trustScore('n2', 1)], consensus);
    assert.ok(indices[0].trust_index < 0.7);
    assert.strictEqual(indices[0].observed_trust, 0.25);
  });

  it('Certificate invalid: verified_trust = 0 and lower trust_index', () => {
    const att = [Object.freeze({ node_id: 'n1', valid: false, certificate_valid: false, commitment_verified: false, trust_anchor_associated: true })];
    assert.strictEqual(computeVerifiedTrust('n1', att), 0);
    const meta = [{ node_id: 'n1' }];
    const indices = computeTrustIndices(meta, [trustScore('n1', 1)], null, att);
    assert.strictEqual(indices[0].verified_trust, 0);
    assert.ok(indices[0].trust_index < 0.8);
  });

  it('Determinism: shuffled inputs produce identical NodeTrustIndex[]', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const scoresShuffled: NodeTrustScore[] = [trustScore('n2', 0.6), trustScore('n1', 0.8)];
    const metaShuffled = [meta[1], meta[0]];
    const attestations = verifyCertificateAttestations(registry.nodes, registry.trust_anchors, 5000);
    const attestationsShuffled = [attestations[1], attestations[0]];
    const a = computeTrustIndices(meta, [trustScore('n1', 0.8), trustScore('n2', 0.6)], null, attestations, { n1: 'org1', n2: 'org1' });
    const b = computeTrustIndices(metaShuffled, scoresShuffled, null, attestationsShuffled, { n2: 'org1', n1: 'org1' });
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('Full engine integration: report_hash recompute equals report.report_hash', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const params: InterOrgTrustEngineParams = {
      nodeMetadata: meta,
      trustScores: [trustScore('n1', 0.8), trustScore('n2', 0.6)],
      nodeRecords: registry.nodes,
      trustAnchors: registry.trust_anchors,
      timestamp: 5000,
    };
    const report = runInterOrgTrustEngine(params);
    assert.ok(report.node_trust_indices.length > 0);
    assert.ok(report.trust_proof.trust_hash.length > 0);
    assert.strictEqual(verifyFederatedTrustReport(report), true);
    const recomputed = calculateReportHash({
      node_trust_indices: report.node_trust_indices,
      attestation_results: report.attestation_results,
      trust_proof: report.trust_proof,
    });
    assert.strictEqual(recomputed, report.report_hash);
  });
});
