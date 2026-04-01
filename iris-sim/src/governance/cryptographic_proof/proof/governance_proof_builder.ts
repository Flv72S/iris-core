/**
 * Step 8E — Governance proof builder. Builds cryptographic proof from decision pipeline.
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
 * Build governance proof from snapshot, enforcement, adaptation, and runtime decision.
 */
export function buildGovernanceProof(
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision
): GovernanceProof {
  const governance_snapshot_hash = hashObjectDeterministic(governanceSnapshot);
  const policy_enforcement_hash = hashObjectDeterministic(enforcement);
  const adaptation_hash = hashObjectDeterministic(adaptation);
  const runtime_decision_hash = hashObjectDeterministic(runtimeDecision);

  const combined =
    governance_snapshot_hash +
    policy_enforcement_hash +
    adaptation_hash +
    runtime_decision_hash;
  const final_proof_hash = sha256Hex(combined);
  const proof_id = sha256Hex(final_proof_hash);
  const timestamp = Date.now();

  return Object.freeze({
    proof_id,
    governance_snapshot_hash,
    policy_enforcement_hash,
    adaptation_hash,
    runtime_decision_hash,
    final_proof_hash,
    timestamp,
  });
}
