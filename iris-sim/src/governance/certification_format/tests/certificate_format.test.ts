/**
 * Microstep 9L — Governance Certification Format. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  IRISGovernanceCertificateInput,
  IRISGovernanceCertificate,
  AuditMetadata,
} from '../types/certificate_types.js';
import { buildIRISGovernanceCertificate } from '../engine/certificate_builder.js';
import { verifyIRISGovernanceCertificate } from '../verify/certificate_verifier.js';
import {
  getCertificateSignaturePayload,
  attachCertificateSignature,
  exportCertificateToJSON,
} from '../export/certificate_exporter.js';

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

function makeInput(overrides?: Partial<{
  attestation_hash: string;
  trust_index_hash: string;
  safety_proof_hash: string;
  audit_metadata: AuditMetadata;
  certificate_version: string;
  format_version: string;
  timestamp: string;
}>): IRISGovernanceCertificateInput {
  const attestation_hash = overrides?.attestation_hash ?? 'ath1';
  const trust_index_hash = overrides?.trust_index_hash ?? 'tih1';
  const safety_proof_hash = overrides?.safety_proof_hash ?? 'sph1';
  const timestamp = overrides?.timestamp ?? '2025-01-15T12:00:00.000Z';
  return {
    attestation: makeAttestation(attestation_hash),
    trust_index_report: makeTrustIndexReport(75, trust_index_hash),
    safety_proof_hash,
    audit_metadata: overrides?.audit_metadata ?? Object.freeze({ log: 'test', snapshot_version: '1.0' }),
    versioning: Object.freeze({
      certificate_version: overrides?.certificate_version ?? '1.0.0',
      format_version: overrides?.format_version ?? '1.0',
      timestamp,
    }),
  };
}

describe('IRIS Governance Certification Format', () => {
  it('1 — Determinism: same inputs produce same certificate_hash', () => {
    const input = makeInput();
    const a = buildIRISGovernanceCertificate(input);
    const b = buildIRISGovernanceCertificate(input);
    assert.strictEqual(a.certificate_hash, b.certificate_hash);
    assert.strictEqual(a.trust_index, 75);
    assert.strictEqual(a.version, '1.0.0');
    assert.strictEqual(a.format_version, '1.0');
  });

  it('2 — Integrity: any modification changes certificate_hash', () => {
    const input = makeInput();
    const cert = buildIRISGovernanceCertificate(input);
    const tamperedAttestation = makeInput({ attestation_hash: 'ath2' });
    const cert2 = buildIRISGovernanceCertificate(tamperedAttestation);
    assert.notStrictEqual(cert.certificate_hash, cert2.certificate_hash);

    const input3 = makeInput({ trust_index_hash: 'tih2' });
    const cert3 = buildIRISGovernanceCertificate(input3);
    assert.notStrictEqual(cert.certificate_hash, cert3.certificate_hash);

    const input4 = makeInput({ safety_proof_hash: 'sph2' });
    const cert4 = buildIRISGovernanceCertificate(input4);
    assert.notStrictEqual(cert.certificate_hash, cert4.certificate_hash);

    const input5 = makeInput({ audit_metadata: Object.freeze({ log: 'other' }) });
    const cert5 = buildIRISGovernanceCertificate(input5);
    assert.notStrictEqual(cert.certificate_hash, cert5.certificate_hash);

    const input6 = makeInput({ certificate_version: '2.0.0' });
    const cert6 = buildIRISGovernanceCertificate(input6);
    assert.notStrictEqual(cert.certificate_hash, cert6.certificate_hash);
  });

  it('3 — Digital signature: attach and verify certificate still valid', () => {
    const input = makeInput();
    const cert = buildIRISGovernanceCertificate(input);
    const payload = getCertificateSignaturePayload(cert);
    assert.ok(payload.length > 0);
    assert.ok(!payload.includes('signature'));

    const signed = attachCertificateSignature(cert, 'sig-hex-12345');
    assert.strictEqual(signed.signature, 'sig-hex-12345');
    assert.strictEqual(verifyIRISGovernanceCertificate(signed), true);
  });

  it('4 — Export JSON: valid JSON and external compatibility', () => {
    const input = makeInput();
    const cert = buildIRISGovernanceCertificate(input);
    const compact = exportCertificateToJSON(cert);
    const parsed = JSON.parse(compact) as IRISGovernanceCertificate;
    assert.strictEqual(parsed.certificate_hash, cert.certificate_hash);
    assert.strictEqual(parsed.trust_index, cert.trust_index);
    assert.strictEqual(parsed.version, cert.version);

    const pretty = exportCertificateToJSON(cert, 2);
    assert.ok(pretty.includes('\n'));
    const parsedPretty = JSON.parse(pretty);
    assert.strictEqual(parsedPretty.certificate_hash, cert.certificate_hash);
  });

  it('5 — Versioning: multiple versions preserve integrity', () => {
    const v1 = buildIRISGovernanceCertificate(
      makeInput({ certificate_version: '1.0.0', format_version: '1.0' })
    );
    const v2 = buildIRISGovernanceCertificate(
      makeInput({ certificate_version: '2.0.0', format_version: '1.0' })
    );
    const v3 = buildIRISGovernanceCertificate(
      makeInput({ certificate_version: '1.0.0', format_version: '2.0' })
    );
    assert.strictEqual(verifyIRISGovernanceCertificate(v1), true);
    assert.strictEqual(verifyIRISGovernanceCertificate(v2), true);
    assert.strictEqual(verifyIRISGovernanceCertificate(v3), true);
    assert.notStrictEqual(v1.certificate_hash, v2.certificate_hash);
    assert.notStrictEqual(v1.certificate_hash, v3.certificate_hash);
  });

  it('6 — Verifier: tampered certificate_hash fails', () => {
    const input = makeInput();
    const cert = buildIRISGovernanceCertificate(input);
    const tampered: IRISGovernanceCertificate = { ...cert, certificate_hash: cert.certificate_hash + 'x' };
    assert.strictEqual(verifyIRISGovernanceCertificate(tampered), false);
  });
});
