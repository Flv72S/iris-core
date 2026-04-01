/**
 * Phase 11G — Global Audit & Verification Layer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runGlobalGovernanceAudit,
  verifySnapshotIntegrity,
  verifyCertificateIntegrity,
  verifyTrustProof,
  verifyFederatedTrustReportIntegrity,
  checkCrossNodeConsistency,
  type TrustCertificateForAudit,
} from '../index.js';
import type { NodeTrustIndex } from '../../inter_org_trust/types/trust_types.js';
import type { TrustProof } from '../../inter_org_trust/types/trust_types.js';
import type { FederatedTrustReport } from '../../inter_org_trust/types/trust_types.js';
import { buildFederatedTrustReport, verifyFederatedTrustReport } from '../../inter_org_trust/report/federated_trust_report_builder.js';
import { generateTrustProof } from '../../inter_org_trust/proof/trust_proof_generator.js';

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

function cert(node_id: string, organization_id: string, level: 'GOLD' | 'SILVER' | 'BRONZE'): TrustCertificateForAudit {
  return Object.freeze({
    node_id,
    organization_id,
    trust_index: 0.9,
    trust_level: 'HIGH',
    certificate_level: level,
    certificate_timestamp: 1000,
    certificate_hash: 'hash-' + node_id,
  });
}

describe('Governance Audit', () => {
  it('Snapshot integrity failure: trust_index < 0 → FAIL', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', -0.1, 'LOW')];
    assert.strictEqual(verifySnapshotIntegrity(indices), 'FAIL');
  });

  it('Snapshot integrity failure: trust_index > 1 → FAIL', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 1.1, 'HIGH')];
    assert.strictEqual(verifySnapshotIntegrity(indices), 'FAIL');
  });

  it('Certificate integrity failure: missing certificate_hash → FAIL', () => {
    const c = cert('n1', 'org1', 'GOLD') as TrustCertificateForAudit;
    const noHash = Object.freeze({ ...c, certificate_hash: '' });
    assert.strictEqual(verifyCertificateIntegrity(noHash), 'FAIL');
  });

  it('Certificate integrity: empty signature when field present → FAIL', () => {
    const c = Object.freeze({ ...cert('n1', 'org1', 'GOLD'), signature: '' });
    assert.strictEqual(verifyCertificateIntegrity(c), 'FAIL');
  });

  it('Trust proof mismatch: wrong hash → FAIL', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const validProof = generateTrustProof(indices, attestations, 1000);
    const tamperedProof: TrustProof = Object.freeze({
      ...validProof,
      trust_hash: 'wrong-hash',
    });
    assert.strictEqual(
      verifyTrustProof(tamperedProof, indices, attestations),
      'FAIL'
    );
  });

  it('Trust proof valid: correct hash → PASS', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const proof = generateTrustProof(indices, attestations, 1000);
    assert.strictEqual(verifyTrustProof(proof, indices, attestations), 'PASS');
  });

  it('Report verification: valid report → PASS', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const proof = generateTrustProof(indices, attestations, 1000);
    const report = buildFederatedTrustReport(indices, attestations, proof);
    assert.strictEqual(verifyFederatedTrustReport(report), true);
    assert.strictEqual(verifyFederatedTrustReportIntegrity(report), 'PASS');
  });

  it('Cross node consistency: node with certificate but no trust index → FAIL', () => {
    const indices: NodeTrustIndex[] = [];
    const certs: TrustCertificateForAudit[] = [cert('n1', 'org1', 'GOLD')];
    assert.strictEqual(checkCrossNodeConsistency(indices, certs), 'FAIL');
  });

  it('Cross node consistency: trust index exists but no certificate → WARNING', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const certs: TrustCertificateForAudit[] = [];
    assert.strictEqual(checkCrossNodeConsistency(indices, certs), 'WARNING');
  });

  it('Determinism: shuffle inputs → identical audit results', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n2', 'org1', 0.7, 'HIGH'),
      trustIndex('n1', 'org1', 0.8, 'HIGH'),
    ];
    const certs: TrustCertificateForAudit[] = [cert('n1', 'org1', 'GOLD'), cert('n2', 'org1', 'SILVER')];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
      Object.freeze({ node_id: 'n2', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const proof = generateTrustProof(indices, attestations, 2000);
    const report: FederatedTrustReport = buildFederatedTrustReport(indices, attestations, proof);
    const a = runGlobalGovernanceAudit(indices, certs, [proof], report, 3000);
    const b = runGlobalGovernanceAudit([indices[1], indices[0]], [certs[1], certs[0]], [proof], report, 3000);
    assert.strictEqual(JSON.stringify(a.audit_results), JSON.stringify(b.audit_results));
    assert.strictEqual(a.passed_nodes, b.passed_nodes);
    assert.strictEqual(a.cross_node_consistency, b.cross_node_consistency);
  });

  it('runGlobalGovernanceAudit: returns report with results sorted by node_id', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const certs: TrustCertificateForAudit[] = [cert('n1', 'org1', 'GOLD')];
    const attestations = [
      Object.freeze({ node_id: 'n1', valid: true, certificate_valid: true, commitment_verified: true, trust_anchor_associated: true }),
    ];
    const proof = generateTrustProof(indices, attestations, 4000);
    const report = buildFederatedTrustReport(indices, attestations, proof);
    const audit = runGlobalGovernanceAudit(indices, certs, [proof], report, 5000);
    assert.strictEqual(audit.total_nodes, 1);
    assert.strictEqual(audit.audit_results[0].node_id, 'n1');
    assert.strictEqual(audit.audit_results[0].snapshot_integrity, 'PASS');
    assert.strictEqual(audit.audit_timestamp, 5000);
  });
});
