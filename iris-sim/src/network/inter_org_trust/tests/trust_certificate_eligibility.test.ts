/**
 * Phase 11D.2 — Trust Certificate Eligibility tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateCertificateEligibility,
  runInterOrgTrustEngine,
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

function trustIndex(
  node_id: string,
  organization_id: string,
  trust_index: number,
  trust_level: NodeTrustIndex['trust_level']
): NodeTrustIndex {
  const d = trust_index;
  const o = trust_index;
  const v = trust_index;
  return Object.freeze({
    node_id,
    organization_id,
    declared_trust: d,
    observed_trust: o,
    verified_trust: v,
    trust_index,
    trust_level,
  });
}

describe('Trust Certificate Eligibility', () => {
  it('HIGH trust → eligibility_status ELIGIBLE, eligibility_reason TRUST_HIGH', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n1', 'org1', 0.9, 'HIGH'),
    ];
    const result = evaluateCertificateEligibility(indices, 1000);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eligibility_status, 'ELIGIBLE');
    assert.strictEqual(result[0].eligibility_reason, 'TRUST_HIGH');
    assert.strictEqual(result[0].trust_level, 'HIGH');
    assert.strictEqual(result[0].evaluated_timestamp, 1000);
  });

  it('MEDIUM trust → eligibility_status PROBATION', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n1', 'org1', 0.65, 'MEDIUM'),
    ];
    const result = evaluateCertificateEligibility(indices, 2000);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eligibility_status, 'PROBATION');
    assert.strictEqual(result[0].eligibility_reason, 'TRUST_MEDIUM');
  });

  it('LOW trust → eligibility_status PROBATION', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n1', 'org1', 0.35, 'LOW'),
    ];
    const result = evaluateCertificateEligibility(indices, 3000);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eligibility_status, 'PROBATION');
    assert.strictEqual(result[0].eligibility_reason, 'TRUST_LOW');
  });

  it('UNTRUSTED node → eligibility_status INELIGIBLE', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n1', 'org1', 0.1, 'UNTRUSTED'),
    ];
    const result = evaluateCertificateEligibility(indices, 4000);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eligibility_status, 'INELIGIBLE');
    assert.strictEqual(result[0].eligibility_reason, 'NODE_UNTRUSTED');
  });

  it('Determinism: shuffled NodeTrustIndex[] produces identical results', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n2', 'org1', 0.5, 'MEDIUM'),
      trustIndex('n1', 'org1', 0.9, 'HIGH'),
      trustIndex('n3', 'org1', 0.2, 'UNTRUSTED'),
    ];
    const shuffled = [indices[1], indices[2], indices[0]];
    const a = evaluateCertificateEligibility(indices, 5000);
    const b = evaluateCertificateEligibility(shuffled, 5000);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.strictEqual(a[0].node_id, 'n1');
    assert.strictEqual(a[1].node_id, 'n2');
    assert.strictEqual(a[2].node_id, 'n3');
  });

  it('Integration: runInterOrgTrustEngine then evaluateCertificateEligibility', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const params: InterOrgTrustEngineParams = {
      nodeMetadata: meta,
      trustScores: [trustScore('n1', 0.9), trustScore('n2', 0.7)],
      nodeRecords: registry.nodes,
      trustAnchors: registry.trust_anchors,
      timestamp: 6000,
    };
    const report = runInterOrgTrustEngine(params);
    assert.ok(report.node_trust_indices.length >= 1);
    const eligibility = evaluateCertificateEligibility(report.node_trust_indices, 7000);
    assert.strictEqual(eligibility.length, report.node_trust_indices.length);
    const nodeIds = [...report.node_trust_indices].sort((a, b) => a.node_id.localeCompare(b.node_id)).map((n) => n.node_id);
    const eligNodeIds = eligibility.map((e) => e.node_id);
    assert.strictEqual(JSON.stringify(nodeIds), JSON.stringify(eligNodeIds));
    for (let i = 0; i < report.node_trust_indices.length; i++) {
      const ti = report.node_trust_indices.find((t) => t.node_id === eligibility[i].node_id)!;
      assert.strictEqual(eligibility[i].trust_index, ti.trust_index);
      assert.strictEqual(eligibility[i].trust_level, ti.trust_level);
    }
  });
});
