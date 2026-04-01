/**
 * Phase 11E — Trust Certification Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runTrustCertificationEngine,
  signTrustCertificate,
  verifyTrustCertificate,
} from '../index.js';
import type { NodeTrustIndex } from '../../inter_org_trust/types/trust_types.js';
import type { NodeCertificateEligibility } from '../../inter_org_trust/eligibility/trust_certificate_eligibility_types.js';
import {
  runInterOrgTrustEngine,
  evaluateCertificateEligibility,
  type InterOrgTrustEngineParams,
} from '../../inter_org_trust/index.js';
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
  return Object.freeze({
    node_id,
    organization_id,
    declared_trust: trust_index,
    observed_trust: trust_index,
    verified_trust: trust_index,
    trust_index,
    trust_level,
  });
}

function eligibility(
  node_id: string,
  organization_id: string,
  trust_index: number,
  trust_level: NodeCertificateEligibility['trust_level'],
  status: NodeCertificateEligibility['eligibility_status'],
  reason: NodeCertificateEligibility['eligibility_reason'],
  evaluated_timestamp: number
): NodeCertificateEligibility {
  return Object.freeze({
    node_id,
    organization_id,
    trust_index,
    trust_level,
    eligibility_status: status,
    eligibility_reason: reason,
    evaluated_timestamp,
  });
}

describe('Trust Certification Engine', () => {
  it('GOLD certificate: trust_level HIGH, eligibility ELIGIBLE → certificate_level GOLD', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.9, 'HIGH')];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n1', 'org1', 0.9, 'HIGH', 'ELIGIBLE', 'TRUST_HIGH', 1000),
    ];
    const certs = runTrustCertificationEngine(indices, elig, 1000);
    assert.strictEqual(certs.length, 1);
    assert.strictEqual(certs[0].certificate_level, 'GOLD');
    assert.strictEqual(certs[0].trust_level, 'HIGH');
    assert.ok(certs[0].certificate_hash.length > 0);
  });

  it('SILVER certificate: trust_level MEDIUM, eligibility PROBATION → certificate_level SILVER', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.65, 'MEDIUM')];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n1', 'org1', 0.65, 'MEDIUM', 'PROBATION', 'TRUST_MEDIUM', 2000),
    ];
    const certs = runTrustCertificationEngine(indices, elig, 2000);
    assert.strictEqual(certs.length, 1);
    assert.strictEqual(certs[0].certificate_level, 'SILVER');
  });

  it('BRONZE certificate: trust_level LOW, eligibility PROBATION → certificate_level BRONZE', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.35, 'LOW')];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n1', 'org1', 0.35, 'LOW', 'PROBATION', 'TRUST_LOW', 3000),
    ];
    const certs = runTrustCertificationEngine(indices, elig, 3000);
    assert.strictEqual(certs.length, 1);
    assert.strictEqual(certs[0].certificate_level, 'BRONZE');
  });

  it('INELIGIBLE node: no certificate generated', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.1, 'UNTRUSTED')];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n1', 'org1', 0.1, 'UNTRUSTED', 'INELIGIBLE', 'NODE_UNTRUSTED', 4000),
    ];
    const certs = runTrustCertificationEngine(indices, elig, 4000);
    assert.strictEqual(certs.length, 0);
  });

  it('Determinism: shuffled inputs produce identical certificate outputs', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n2', 'org1', 0.5, 'MEDIUM'),
      trustIndex('n1', 'org1', 0.9, 'HIGH'),
    ];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n2', 'org1', 0.5, 'MEDIUM', 'PROBATION', 'TRUST_MEDIUM', 5000),
      eligibility('n1', 'org1', 0.9, 'HIGH', 'ELIGIBLE', 'TRUST_HIGH', 5000),
    ];
    const shuffledIndices = [indices[1], indices[0]];
    const shuffledElig = [elig[1], elig[0]];
    const a = runTrustCertificationEngine(indices, elig, 5000);
    const b = runTrustCertificationEngine(shuffledIndices, shuffledElig, 5000);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.strictEqual(a[0].node_id, 'n1');
    assert.strictEqual(a[1].node_id, 'n2');
  });

  it('Signature verification: sign then verify returns true', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.9, 'HIGH')];
    const elig: NodeCertificateEligibility[] = [
      eligibility('n1', 'org1', 0.9, 'HIGH', 'ELIGIBLE', 'TRUST_HIGH', 6000),
    ];
    const certs = runTrustCertificationEngine(indices, elig, 6000);
    assert.strictEqual(certs.length, 1);
    const cert = certs[0];
    const signingKey = 'test-secret-key';
    const signature = signTrustCertificate(cert, signingKey);
    assert.strictEqual(verifyTrustCertificate(cert, signature, signingKey), true);
  });

  it('Integration: runInterOrgTrustEngine → evaluateCertificateEligibility → runTrustCertificationEngine', () => {
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
      timestamp: 7000,
    };
    const report = runInterOrgTrustEngine(params);
    const eligibilityResults = evaluateCertificateEligibility(report.node_trust_indices, 7000);
    const certs = runTrustCertificationEngine(report.node_trust_indices, eligibilityResults, 7000);
    const eligibleCount = eligibilityResults.filter((e) => e.eligibility_status !== 'INELIGIBLE').length;
    assert.strictEqual(certs.length, eligibleCount);
    const nodeIds = [...certs].sort((a, b) => a.node_id.localeCompare(b.node_id)).map((c) => c.node_id);
    for (let i = 1; i < nodeIds.length; i++) {
      assert.ok(nodeIds[i] >= nodeIds[i - 1]);
    }
    for (const c of certs) {
      assert.ok(c.certificate_hash.length > 0);
      assert.ok(['GOLD', 'SILVER', 'BRONZE'].includes(c.certificate_level));
    }
    const signature = signTrustCertificate(certs[0], 'key');
    assert.strictEqual(verifyTrustCertificate(certs[0], signature, 'key'), true);
  });
});
