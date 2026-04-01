/**
 * Step 8F — Governance Attestation Layer. Attestation type.
 */

import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';

export interface GovernanceAttestation {
  readonly attestation_id: string;
  readonly proof: GovernanceProof;
  readonly governance_tier: string;
  readonly autonomy_level: string;
  readonly allowed_features: readonly string[];
  readonly audit_multiplier: number;
  readonly safety_constraint_level: number;
  readonly decision_allowed: boolean;
  readonly attestation_hash: string;
  readonly timestamp: number;
}
