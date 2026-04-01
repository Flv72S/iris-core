/**
 * Microstep 9M — Governance Verification Engine. Tests.
 */

import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IRISGovernanceCertificate } from '../../certification_format/types/certificate_types.js';
import { buildIRISGovernanceCertificate } from '../../certification_format/engine/certificate_builder.js';
import type { IRISGovernanceCertificateInput, AuditMetadata } from '../../certification_format/types/certificate_types.js';
import { runIRISCertificateVerification, exportVerificationResultToJSON } from '../verify/governance_verifier.js';

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

function recomputeAttestationHash(attestation: ReturnType<typeof makeAttestation>): string {
  const payload =
    attestation.proof.final_proof_hash +
    attestation.governance_tier +
    attestation.autonomy_level +
    JSON.stringify(attestation.allowed_features) +
    String(attestation.audit_multiplier) +
    String(attestation.safety_constraint_level) +
    String(attestation.decision_allowed);
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
  const correct_hash = recomputeAttestationHash(att);
  return makeAttestation(correct_hash);
}

function makeCertificateInput(overrides?: Partial<{
  attestation_hash: string;
  trust_index_hash: string;
  safety_proof_hash: string;
  audit_metadata: AuditMetadata;
  timestamp: string;
}>): IRISGovernanceCertificateInput {
  const attestation = overrides?.attestation_hash
    ? makeAttestation(overrides.attestation_hash)
    : makeCoherentAttestation();
  return {
    attestation,
    trust_index_report: makeTrustIndexReport(75, overrides?.trust_index_hash ?? 'tih1'),
    safety_proof_hash: overrides?.safety_proof_hash ?? 'sph1',
    audit_metadata: overrides?.audit_metadata ?? Object.freeze({ log: 'test', snapshot_version: '1.0' }),
    versioning: Object.freeze({
      certificate_version: '1.0.0',
      format_version: '1.0',
      timestamp: overrides?.timestamp ?? '2025-01-15T12:00:00.000Z',
    }),
  };
}

describe('Governance Verification Engine', () => {
  it('PASS: valid certificate yields verification_status PASS', () => {
    const input = makeCertificateInput();
    const cert = buildIRISGovernanceCertificate(input);
    const result = runIRISCertificateVerification(cert);
    assert.strictEqual(result.verification_status, 'PASS');
    assert.strictEqual(result.integrity_hash_check, true);
    assert.strictEqual(result.attestation_coherence_check, true);
    assert.strictEqual(result.safety_proof_validity, true);
    assert.strictEqual(result.trust_index_consistency, true);
    assert.strictEqual(result.telemetry_integrity_check, true);
    assert.strictEqual(result.timestamp_verification, true);
    assert.strictEqual(result.certificate_id, cert.certificate_hash);
    assert.ok(result.verification_hash.length > 0);
  });

  it('FAIL: tampered certificate_hash fails integrity and yields FAIL', () => {
    const input = makeCertificateInput();
    const cert = buildIRISGovernanceCertificate(input);
    const tampered: IRISGovernanceCertificate = {
      ...cert,
      certificate_hash: cert.certificate_hash + 'x',
    };
    const result = runIRISCertificateVerification(tampered);
    assert.strictEqual(result.verification_status, 'FAIL');
    assert.strictEqual(result.integrity_hash_check, false);
    assert.ok(result.error_message);
    assert.ok(Array.isArray(result.alerts) && result.alerts.length > 0);
  });

  it('FAIL: incoherent attestation (wrong attestation_hash) yields FAIL', () => {
    const input = makeCertificateInput();
    const cert = buildIRISGovernanceCertificate(input);
    const tampered: IRISGovernanceCertificate = {
      ...cert,
      attestation: {
        ...cert.attestation,
        attestation_hash: 'wrong_hash_value_12345',
      },
    };
    const result = runIRISCertificateVerification(tampered);
    assert.strictEqual(result.verification_status, 'FAIL');
    assert.strictEqual(result.integrity_hash_check, false);
    assert.strictEqual(result.attestation_coherence_check, false);
  });

  it('FAIL: invalid timestamp yields timestamp_verification false and FAIL', () => {
    const input = makeCertificateInput({ timestamp: 'not-a-date' });
    const cert = buildIRISGovernanceCertificate(input);
    const result = runIRISCertificateVerification(cert);
    assert.strictEqual(result.verification_status, 'FAIL');
    assert.strictEqual(result.timestamp_verification, false);
  });

  it('Determinism: same certificate yields same verification_hash', () => {
    const input = makeCertificateInput();
    const cert = buildIRISGovernanceCertificate(input);
    const a = runIRISCertificateVerification(cert);
    const b = runIRISCertificateVerification(cert);
    assert.strictEqual(a.verification_hash, b.verification_hash);
    assert.strictEqual(a.verification_status, b.verification_status);
  });

  it('Export JSON: result is serializable and parseable', () => {
    const input = makeCertificateInput();
    const cert = buildIRISGovernanceCertificate(input);
    const result = runIRISCertificateVerification(cert);
    const json = exportVerificationResultToJSON(result);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.verification_status, result.verification_status);
    assert.strictEqual(parsed.certificate_id, result.certificate_id);
    assert.strictEqual(parsed.verification_hash, result.verification_hash);
  });
});
