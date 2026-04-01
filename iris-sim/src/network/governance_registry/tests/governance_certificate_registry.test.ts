/**
 * Step 10B — Governance Certificate Registry. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IRISGovernanceCertificateInput, AuditMetadata } from '../../../governance/certification_format/types/certificate_types.js';
import { buildIRISGovernanceCertificate } from '../../../governance/certification_format/engine/certificate_builder.js';
import { GovernanceCertificateRegistry } from '../registry/governance_certificate_registry.js';
import {
  queryCertificatesByOrganization,
  queryCertificatesByType,
} from '../query/governance_registry_query.js';
import { verifyStoredCertificate } from '../verify/governance_registry_verifier.js';

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
  attestation_hash: string;
  trust_index_hash: string;
  safety_proof_hash: string;
  audit_metadata: AuditMetadata;
  certificate_version: string;
}>): IRISGovernanceCertificateInput {
  const attestation_hash = overrides?.attestation_hash ?? 'ath1';
  const trust_index_hash = overrides?.trust_index_hash ?? 'tih1';
  const safety_proof_hash = overrides?.safety_proof_hash ?? 'sph1';
  return {
    attestation: makeAttestation(attestation_hash),
    trust_index_report: makeTrustIndexReport(75, trust_index_hash),
    safety_proof_hash,
    audit_metadata: overrides?.audit_metadata ?? Object.freeze({ log: 'test' }),
    versioning: Object.freeze({
      certificate_version: overrides?.certificate_version ?? '1.0.0',
      format_version: '1.0',
      timestamp: '2025-01-15T12:00:00.000Z',
    }),
  };
}

describe('Governance Certificate Registry', () => {
  it('1 — Registry initialization', () => {
    const registry = new GovernanceCertificateRegistry();
    const list = registry.listCertificates();
    assert.strictEqual(list.length, 0);
    assert.strictEqual(registry.getCertificate('any'), null);
  });

  it('2 — Store certificate', () => {
    const registry = new GovernanceCertificateRegistry();
    const input = makeCertificateInput();
    const certificate = buildIRISGovernanceCertificate(input);
    const record = registry.storeCertificate(certificate);
    assert.ok(record);
    assert.strictEqual(record.certificate_id, certificate.certificate_hash);
    assert.strictEqual(record.certificate.certificate_hash, certificate.certificate_hash);
    assert.strictEqual(typeof record.stored_at, 'number');
    assert.strictEqual(registry.listCertificates().length, 1);
  });

  it('3 — Duplicate prevention', () => {
    const registry = new GovernanceCertificateRegistry();
    const input = makeCertificateInput();
    const certificate = buildIRISGovernanceCertificate(input);
    const record1 = registry.storeCertificate(certificate);
    const record2 = registry.storeCertificate(certificate);
    assert.strictEqual(record1.certificate_id, record2.certificate_id);
    assert.strictEqual(record1.stored_at, record2.stored_at);
    assert.strictEqual(registry.listCertificates().length, 1);
  });

  it('4 — Retrieve certificate', () => {
    const registry = new GovernanceCertificateRegistry();
    const input = makeCertificateInput({ trust_index_hash: 'tih-unique' });
    const certificate = buildIRISGovernanceCertificate(input);
    registry.storeCertificate(certificate);
    const retrieved = registry.getCertificate(certificate.certificate_hash);
    assert.ok(retrieved);
    assert.strictEqual(retrieved!.certificate_id, certificate.certificate_hash);
    assert.strictEqual(registry.getCertificate('non-existent'), null);
  });

  it('5 — List certificates', () => {
    const registry = new GovernanceCertificateRegistry();
    const cert1 = buildIRISGovernanceCertificate(makeCertificateInput({ trust_index_hash: 'tih-a' }));
    const cert2 = buildIRISGovernanceCertificate(makeCertificateInput({ trust_index_hash: 'tih-b' }));
    registry.storeCertificate(cert2);
    registry.storeCertificate(cert1);
    const list = registry.listCertificates();
    assert.strictEqual(list.length, 2);
    const ids = list.map((r) => r.certificate_id);
    const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepStrictEqual(ids, sorted);
  });

  it('6 — Organization query', () => {
    const registry = new GovernanceCertificateRegistry();
    const certA = buildIRISGovernanceCertificate(
      makeCertificateInput({
        audit_metadata: Object.freeze({ organization: 'org-A', log: 'a' }),
        trust_index_hash: 'tih-org-a',
      })
    );
    const certB = buildIRISGovernanceCertificate(
      makeCertificateInput({
        audit_metadata: Object.freeze({ organization: 'org-B', log: 'b' }),
        trust_index_hash: 'tih-org-b',
      })
    );
    registry.storeCertificate(certA);
    registry.storeCertificate(certB);
    const byOrgA = queryCertificatesByOrganization(registry, 'org-A');
    const byOrgB = queryCertificatesByOrganization(registry, 'org-B');
    assert.strictEqual(byOrgA.length, 1);
    assert.strictEqual(byOrgB.length, 1);
    assert.strictEqual(byOrgA[0].certificate_id, certA.certificate_hash);
    assert.strictEqual(byOrgB[0].certificate_id, certB.certificate_hash);
    assert.strictEqual(queryCertificatesByOrganization(registry, 'unknown').length, 0);
  });

  it('7 — Type query', () => {
    const registry = new GovernanceCertificateRegistry();
    const certV1 = buildIRISGovernanceCertificate(
      makeCertificateInput({ certificate_version: '1.0.0', trust_index_hash: 'tih-v1' })
    );
    const certV2 = buildIRISGovernanceCertificate(
      makeCertificateInput({ certificate_version: '2.0.0', trust_index_hash: 'tih-v2' })
    );
    registry.storeCertificate(certV1);
    registry.storeCertificate(certV2);
    const byType1 = queryCertificatesByType(registry, '1.0.0');
    const byType2 = queryCertificatesByType(registry, '2.0.0');
    assert.strictEqual(byType1.length, 1);
    assert.strictEqual(byType2.length, 1);
    assert.strictEqual(byType1[0].certificate.version, '1.0.0');
    assert.strictEqual(byType2[0].certificate.version, '2.0.0');
    assert.strictEqual(queryCertificatesByType(registry, '3.0.0').length, 0);
  });

  it('8 — Verification integration', () => {
    const registry = new GovernanceCertificateRegistry();
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const record = registry.storeCertificate(certificate);
    const result = verifyStoredCertificate(record);
    assert.ok(result);
    assert.strictEqual(typeof result.verification_status, 'string');
    assert.ok(result.verification_status === 'PASS' || result.verification_status === 'FAIL');
    assert.strictEqual(result.certificate_id, record.certificate_id);
    assert.strictEqual(typeof result.integrity_hash_check, 'boolean');
    assert.strictEqual(typeof result.verification_hash, 'string');
  });
});
