/**
 * Step 8I — Governance Certificate Builder. Deterministic full-state certification.
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
const ISSUER = 'IRIS_GOVERNANCE_ENGINE';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build signed Governance Certificate from full governance pipeline state.
 */
export function buildGovernanceCertificate(
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision,
  governanceProof: GovernanceProof
): GovernanceCertificate {
  const governance_snapshot_hash = hashObjectDeterministic(governanceSnapshot);
  const policy_enforcement_hash = hashObjectDeterministic(enforcement);
  const adaptation_hash = hashObjectDeterministic(adaptation);
  const runtime_decision_hash = hashObjectDeterministic(runtimeDecision);
  const governance_proof_hash = hashObjectDeterministic(governanceProof);

  const combined =
    governance_snapshot_hash +
    policy_enforcement_hash +
    adaptation_hash +
    runtime_decision_hash +
    governance_proof_hash;
  const final_certificate_hash = sha256Hex(combined);
  const certificate_id = sha256Hex(final_certificate_hash);
  const signature = sha256Hex(final_certificate_hash + IRIS_CERTIFICATION_ROOT_KEY);
  const timestamp = Date.now();
  const tier = governanceSnapshot.tier;

  return Object.freeze({
    certificate_id,
    tier,
    governance_snapshot_hash,
    policy_enforcement_hash,
    adaptation_hash,
    runtime_decision_hash,
    governance_proof_hash,
    final_certificate_hash,
    timestamp,
    issuer: ISSUER,
    signature,
  });
}
