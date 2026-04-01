/**
 * Step 8E — Governance proof verifier. Recomputes hashes and checks integrity.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceProof } from '../types/proof_types.js';
import { hashObjectDeterministic } from '../hashing/governance_hash.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify proof by recomputing all hashes. Returns true iff final_proof_hash matches.
 */
export function verifyGovernanceProof(
  proof: GovernanceProof,
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision
): boolean {
  const governance_snapshot_hash = hashObjectDeterministic(governanceSnapshot);
  const policy_enforcement_hash = hashObjectDeterministic(enforcement);
  const adaptation_hash = hashObjectDeterministic(adaptation);
  const runtime_decision_hash = hashObjectDeterministic(runtimeDecision);

  if (proof.governance_snapshot_hash !== governance_snapshot_hash) return false;
  if (proof.policy_enforcement_hash !== policy_enforcement_hash) return false;
  if (proof.adaptation_hash !== adaptation_hash) return false;
  if (proof.runtime_decision_hash !== runtime_decision_hash) return false;

  const combined =
    governance_snapshot_hash +
    policy_enforcement_hash +
    adaptation_hash +
    runtime_decision_hash;
  const computedFinal = sha256Hex(combined);
  return computedFinal === proof.final_proof_hash;
}
