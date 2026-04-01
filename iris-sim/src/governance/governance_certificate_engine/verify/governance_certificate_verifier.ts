/**
 * Step 8I — Governance Certificate Verifier. Tamper detection.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import type { GovernanceCertificate } from '../types/certification_types.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';

const IRIS_CERTIFICATION_ROOT_KEY = 'IRIS_CERTIFICATION_ROOT_KEY_v1';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify certificate by recomputing all hashes and signature. Returns true only if everything matches.
 */
export function verifyGovernanceCertificate(
  certificate: GovernanceCertificate,
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision,
  governanceProof: GovernanceProof
): boolean {
  const governance_snapshot_hash = hashObjectDeterministic(governanceSnapshot);
  const policy_enforcement_hash = hashObjectDeterministic(enforcement);
  const adaptation_hash = hashObjectDeterministic(adaptation);
  const runtime_decision_hash = hashObjectDeterministic(runtimeDecision);
  const governance_proof_hash = hashObjectDeterministic(governanceProof);

  if (certificate.governance_snapshot_hash !== governance_snapshot_hash) return false;
  if (certificate.policy_enforcement_hash !== policy_enforcement_hash) return false;
  if (certificate.adaptation_hash !== adaptation_hash) return false;
  if (certificate.runtime_decision_hash !== runtime_decision_hash) return false;
  if (certificate.governance_proof_hash !== governance_proof_hash) return false;

  const combined =
    governance_snapshot_hash +
    policy_enforcement_hash +
    adaptation_hash +
    runtime_decision_hash +
    governance_proof_hash;
  const final_certificate_hash = sha256Hex(combined);
  if (certificate.final_certificate_hash !== final_certificate_hash) return false;

  const certificate_id = sha256Hex(final_certificate_hash);
  if (certificate.certificate_id !== certificate_id) return false;

  const signature = sha256Hex(final_certificate_hash + IRIS_CERTIFICATION_ROOT_KEY);
  return certificate.signature === signature;
}
