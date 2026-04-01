/**
 * Step 10C — Cross-Node Governance Verification Engine. Tests.
 */

import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IRISGovernanceCertificateInput, AuditMetadata } from '../../../governance/certification_format/types/certificate_types.js';
import { buildIRISGovernanceCertificate } from '../../../governance/certification_format/engine/certificate_builder.js';
import { generateIRISNodeIdentity } from '../../node_identity/engine/iris_node_identity_engine.js';
import { GovernanceCertificateRegistry } from '../../governance_registry/registry/governance_certificate_registry.js';
import { verifyCrossNodeCertificate } from '../engine/cross_node_verification_engine.js';
import { storeVerifiedCertificate } from '../integration/registry_integration.js';

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

function recomputeAttestationHash(att: ReturnType<typeof makeAttestation>): string {
  const payload =
    att.proof.final_proof_hash +
    att.governance_tier +
    att.autonomy_level +
    JSON.stringify(att.allowed_features) +
    String(att.audit_multiplier) +
    String(att.safety_constraint_level) +
    String(att.decision_allowed);
  return createHash('sha256').update(payload, 'utf8').digest('hex');
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

function makeCoherentAttestation(): ReturnType<typeof makeAttestation> {
  const att = makeAttestation('placeholder');
  return makeAttestation(recomputeAttestationHash(att));
}

function makeCertificateInput(overrides?: Partial<{
  trust_index_hash: string;
  safety_proof_hash: string;
  audit_metadata: AuditMetadata;
}>): IRISGovernanceCertificateInput {
  return {
    attestation: makeCoherentAttestation(),
    trust_index_report: makeTrustIndexReport(75, overrides?.trust_index_hash ?? 'tih1'),
    safety_proof_hash: overrides?.safety_proof_hash ?? 'sph1',
    audit_metadata: overrides?.audit_metadata ?? Object.freeze({ log: 'test' }),
    versioning: Object.freeze({
      certificate_version: '1.0.0',
      format_version: '1.0',
      timestamp: '2025-01-15T12:00:00.000Z',
    }),
  };
}

describe('Cross-Node Governance Verification Engine', () => {
  it('1 — Verifica certificato valido', () => {
    const certInput = makeCertificateInput();
    const certificate = buildIRISGovernanceCertificate(certInput);
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'node-1', organization: 'org-1', deployment_environment: 'prod' },
      public_key: 'pk-abc',
    });
    const result = verifyCrossNodeCertificate({ certificate, issuing_node_identity: nodeIdentity });
    assert.strictEqual(result.node_identity_valid, true);
    assert.strictEqual(result.governance_verification.verification_status, 'PASS');
    assert.strictEqual(result.certificate_id, certificate.certificate_hash);
    assert.strictEqual(result.issuing_node_id, nodeIdentity.node_id);
  });

  it('2 — Nodo emittente invalido', () => {
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const validIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const tamperedIdentity = {
      ...validIdentity,
      identity_hash: validIdentity.identity_hash + 'x',
    };
    const result = verifyCrossNodeCertificate({
      certificate,
      issuing_node_identity: tamperedIdentity,
    });
    assert.strictEqual(result.node_identity_valid, false);
  });

  it('3 — Certificato governance invalido', () => {
    const certInput = makeCertificateInput();
    const certificate = buildIRISGovernanceCertificate(certInput);
    const tamperedCertificate = {
      ...certificate,
      certificate_hash: certificate.certificate_hash + 'x',
    };
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const result = verifyCrossNodeCertificate({
      certificate: tamperedCertificate,
      issuing_node_identity: nodeIdentity,
    });
    assert.strictEqual(result.node_identity_valid, true);
    assert.strictEqual(result.governance_verification.verification_status, 'FAIL');
  });

  it('4 — Risultato aggregato corretto', () => {
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const result = verifyCrossNodeCertificate({ certificate, issuing_node_identity: nodeIdentity });
    assert.strictEqual(typeof result.certificate_id, 'string');
    assert.strictEqual(typeof result.issuing_node_id, 'string');
    assert.strictEqual(typeof result.node_identity_valid, 'boolean');
    assert.ok(result.governance_verification);
    assert.strictEqual(typeof result.governance_verification.verification_status, 'string');
    assert.strictEqual(typeof result.verification_timestamp, 'number');
  });

  it('5 — Timestamp generato', () => {
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const result = verifyCrossNodeCertificate({ certificate, issuing_node_identity: nodeIdentity });
    assert.ok(result.verification_timestamp > 0);
    assert.ok(Number.isFinite(result.verification_timestamp));
  });

  it('6 — Integrazione con registry', () => {
    const registry = new GovernanceCertificateRegistry();
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const { result, record } = storeVerifiedCertificate(registry, {
      certificate,
      issuing_node_identity: nodeIdentity,
    });
    assert.strictEqual(result.governance_verification.verification_status, 'PASS');
    assert.strictEqual(result.node_identity_valid, true);
    assert.ok(record);
    assert.strictEqual(record!.certificate_id, certificate.certificate_hash);
    assert.strictEqual(registry.listCertificates().length, 1);
  });

  it('7 — Certificato non valido non salvato', () => {
    const registry = new GovernanceCertificateRegistry();
    const certInput = makeCertificateInput();
    const certificate = buildIRISGovernanceCertificate(certInput);
    const tamperedCertificate = { ...certificate, certificate_hash: 'invalid-hash' };
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const { result, record } = storeVerifiedCertificate(registry, {
      certificate: tamperedCertificate,
      issuing_node_identity: nodeIdentity,
    });
    assert.strictEqual(result.governance_verification.verification_status, 'FAIL');
    assert.strictEqual(record, null);
    assert.strictEqual(registry.listCertificates().length, 0);
  });

  it('8 — Determinismo', () => {
    const certificate = buildIRISGovernanceCertificate(makeCertificateInput());
    const nodeIdentity = generateIRISNodeIdentity({
      metadata: { node_name: 'n', organization: 'o', deployment_environment: 'e' },
      public_key: 'pk',
    });
    const input = { certificate, issuing_node_identity: nodeIdentity };
    const a = verifyCrossNodeCertificate(input);
    const b = verifyCrossNodeCertificate(input);
    assert.strictEqual(a.certificate_id, b.certificate_id);
    assert.strictEqual(a.issuing_node_id, b.issuing_node_id);
    assert.strictEqual(a.node_identity_valid, b.node_identity_valid);
    assert.strictEqual(a.governance_verification.verification_status, b.governance_verification.verification_status);
    assert.strictEqual(a.governance_verification.verification_hash, b.governance_verification.verification_hash);
  });
});
