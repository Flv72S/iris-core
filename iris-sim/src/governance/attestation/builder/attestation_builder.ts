/**
 * Step 8F — Attestation builder. Builds GovernanceAttestation from proof + adaptation + decision.
 */

import { createHash } from 'node:crypto';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceAttestation } from '../types/attestation_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build attestation from proof, adaptation, and runtime decision.
 */
export function buildGovernanceAttestation(
  proof: GovernanceProof,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision
): GovernanceAttestation {
  const profile = adaptation.adaptation_profile;
  const governance_tier = adaptation.tier;
  const autonomy_level = profile.autonomy;
  const allowed_features = profile.allowedFeatureSet;
  const audit_multiplier = profile.auditFrequencyMultiplier;
  const safety_constraint_level = profile.safetyConstraintLevel;
  const decision_allowed = runtimeDecision.allowed;

  const payload =
    proof.final_proof_hash +
    governance_tier +
    autonomy_level +
    JSON.stringify(allowed_features) +
    String(audit_multiplier) +
    String(safety_constraint_level) +
    String(decision_allowed);
  const attestation_hash = sha256Hex(payload);
  const attestation_id = sha256Hex(attestation_hash);
  const timestamp = Date.now();

  return Object.freeze({
    attestation_id,
    proof,
    governance_tier,
    autonomy_level,
    allowed_features,
    audit_multiplier,
    safety_constraint_level,
    decision_allowed,
    attestation_hash,
    timestamp,
  });
}
