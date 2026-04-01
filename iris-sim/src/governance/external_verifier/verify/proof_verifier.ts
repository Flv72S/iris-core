/**
 * Step 8K — External proof verifier. Wraps Step 8E verifyGovernanceProof.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import { verifyGovernanceProof } from '../../cryptographic_proof/verify/governance_proof_verifier.js';
import type { VerificationResult } from '../types/verifier_types.js';

/**
 * Verify governance proof with full pipeline inputs. Reuses Step 8E verifier.
 */
export function verifyGovernanceProofExternal(
  proof: GovernanceProof,
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision
): VerificationResult {
  const ok = verifyGovernanceProof(
    proof,
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision
  );
  if (ok) return Object.freeze({ valid: true });
  return Object.freeze({ valid: false, reason: 'proof_verification_failed' });
}
