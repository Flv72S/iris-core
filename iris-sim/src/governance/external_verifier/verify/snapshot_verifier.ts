/**
 * Step 8K — External snapshot verifier. Validates structure and optional Trust Anchor signature.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { GovernanceSignature } from '../../trust_anchor/types/trust_anchor_types.js';
import { verifyGovernanceSignature } from '../../trust_anchor/verify/governance_signature_verifier.js';
import type { VerificationResult } from '../types/verifier_types.js';

const VALID_TIERS = new Set<string>([
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
]);

/**
 * Verify snapshot integrity: required fields, tier in allowed set, score in [0,1]. Optionally verify Trust Anchor signature.
 */
export function verifySnapshotIntegrity(
  snapshot: GovernanceTierSnapshot,
  signature?: GovernanceSignature
): VerificationResult {
  if (!VALID_TIERS.has(snapshot.tier)) {
    return Object.freeze({ valid: false, reason: 'invalid_tier' });
  }
  if (typeof snapshot.score !== 'number' || snapshot.score < 0 || snapshot.score > 1) {
    return Object.freeze({ valid: false, reason: 'invalid_score' });
  }
  if (!snapshot.normalizedMetrics || typeof snapshot.computedAt !== 'number') {
    return Object.freeze({ valid: false, reason: 'missing_fields' });
  }
  if (signature !== undefined) {
    const sigOk = verifyGovernanceSignature(snapshot, signature);
    if (!sigOk) return Object.freeze({ valid: false, reason: 'invalid_signature' });
  }
  return Object.freeze({ valid: true });
}
