/**
 * Step 8F — Attestation verifier. Verifies proof then attestation hash.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import { verifyGovernanceProof } from '../../cryptographic_proof/verify/governance_proof_verifier.js';
import type { GovernanceAttestation } from '../types/attestation_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify attestation: 1) verify embedded proof; 2) recompute attestation_hash and compare.
 */
export function verifyGovernanceAttestation(
  attestation: GovernanceAttestation,
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision
): boolean {
  const proofOk = verifyGovernanceProof(
    attestation.proof,
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision
  );
  if (!proofOk) return false;

  const payload =
    attestation.proof.final_proof_hash +
    attestation.governance_tier +
    attestation.autonomy_level +
    JSON.stringify(attestation.allowed_features) +
    String(attestation.audit_multiplier) +
    String(attestation.safety_constraint_level) +
    String(attestation.decision_allowed);
  const computedHash = sha256Hex(payload);
  return computedHash === attestation.attestation_hash;
}
