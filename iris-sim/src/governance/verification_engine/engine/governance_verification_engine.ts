/**
 * Microstep 9M — Governance Verification Engine. Core logic.
 */

import { createHash } from 'node:crypto';
import type { IRISGovernanceCertificate } from '../../certification_format/types/certificate_types.js';
import { verifyIRISGovernanceCertificate } from '../../certification_format/verify/certificate_verifier.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceVerificationResult, VerificationStatus } from '../types/governance_verification_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Recompute attestation hash from attestation content (same formula as attestation builder).
 * Enables attestation_coherence_check without access to adaptation/decision.
 */
function recomputeAttestationHashFromContent(attestation: IRISGovernanceCertificate['attestation']): string {
  const proof = attestation.proof;
  const payload =
    proof.final_proof_hash +
    attestation.governance_tier +
    attestation.autonomy_level +
    JSON.stringify(attestation.allowed_features) +
    String(attestation.audit_multiplier) +
    String(attestation.safety_constraint_level) +
    String(attestation.decision_allowed);
  return sha256Hex(payload);
}

/**
 * Validate timestamp is non-empty and valid ISO 8601 format. Optionally not in future.
 */
function validateTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return !Number.isNaN(date.getTime());
}

/**
 * Run all verification checks on an IRIS Governance Certificate.
 * Deterministic, stateless, read-only.
 */
export function runGovernanceVerification(
  certificate: IRISGovernanceCertificate
): GovernanceVerificationResult {
  const alerts: string[] = [];
  const certificate_id = certificate.certificate_hash;

  const integrity_hash_check = verifyIRISGovernanceCertificate(certificate);
  if (!integrity_hash_check) {
    alerts.push('Certificate integrity hash mismatch');
  }

  const expectedAttestationHash = recomputeAttestationHashFromContent(certificate.attestation);
  const attestation_coherence_check =
    certificate.attestation.attestation_hash === expectedAttestationHash;
  if (!attestation_coherence_check) {
    alerts.push('Attestation hash does not match attestation content');
  }

  const safety_proof_validity =
    integrity_hash_check &&
    typeof certificate.safety_proof_hash === 'string' &&
    certificate.safety_proof_hash.length > 0;
  if (!safety_proof_validity && integrity_hash_check) {
    alerts.push('Safety proof hash missing or invalid');
  }

  const trustIndexInRange =
    typeof certificate.trust_index === 'number' &&
    certificate.trust_index >= 0 &&
    certificate.trust_index <= 100;
  const trustIndexHashPresent =
    typeof certificate.trust_index_hash === 'string' &&
    certificate.trust_index_hash.length > 0;
  const trust_index_consistency =
    integrity_hash_check && trustIndexInRange && trustIndexHashPresent;
  if (!trust_index_consistency && integrity_hash_check) {
    if (!trustIndexInRange) alerts.push('Trust index out of range [0, 100]');
    if (!trustIndexHashPresent) alerts.push('Trust index hash missing');
  }

  const telemetry_integrity_check = integrity_hash_check;
  if (!telemetry_integrity_check) {
    alerts.push('Audit metadata / telemetry integrity failed (certificate hash)');
  }

  const timestamp_verification = validateTimestamp(certificate.timestamp);
  if (!timestamp_verification) {
    alerts.push('Timestamp invalid or not ISO 8601');
  }

  const allPassed =
    integrity_hash_check &&
    attestation_coherence_check &&
    safety_proof_validity &&
    trust_index_consistency &&
    telemetry_integrity_check &&
    timestamp_verification;

  const verification_status: VerificationStatus = allPassed ? 'PASS' : 'FAIL';
  const error_message: string | undefined = alerts.length > 0 ? alerts.join('; ') : undefined;
  const alertsReadonly = Object.freeze([...alerts]) as readonly string[];

  const payloadForHash: Record<string, unknown> = {
    certificate_id,
    verification_status,
    integrity_hash_check,
    attestation_coherence_check,
    safety_proof_validity,
    trust_index_consistency,
    telemetry_integrity_check,
    timestamp_verification,
    alerts: alertsReadonly,
  };
  if (error_message !== undefined) payloadForHash.error_message = error_message;
  const verification_hash = hashObjectDeterministic(payloadForHash);

  const result: GovernanceVerificationResult = {
    certificate_id,
    verification_status,
    integrity_hash_check,
    attestation_coherence_check,
    safety_proof_validity,
    trust_index_consistency,
    telemetry_integrity_check,
    verification_hash,
    timestamp_verification,
    alerts: alertsReadonly,
    ...(error_message !== undefined ? { error_message } : {}),
  };
  return Object.freeze(result);
}
