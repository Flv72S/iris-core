/**
 * Step 8C — Self-Adaptation Engine. Computes adaptation snapshot from governance + enforcement.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot, AdaptationProfile } from '../types/adaptation_types.js';
import { computeAutonomyLevel } from '../strategies/autonomy_strategy.js';
import { computeAuditMultiplier } from '../strategies/audit_strategy.js';
import { resolveAllowedFeatures } from '../strategies/feature_strategy.js';
import { computeSafetyConstraintLevel } from '../strategies/safety_strategy.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Compute full adaptation snapshot from tier snapshot and policy enforcement.
 */
export function computeAdaptationSnapshot(
  snapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult
): AdaptationSnapshot {
  const autonomy = computeAutonomyLevel(snapshot);
  const auditFrequencyMultiplier = computeAuditMultiplier(snapshot, enforcement);
  const allowedFeatureSet = resolveAllowedFeatures(snapshot, enforcement);
  const safetyConstraintLevel = computeSafetyConstraintLevel(snapshot);

  const adaptation_profile: AdaptationProfile = Object.freeze({
    autonomy,
    auditFrequencyMultiplier,
    safetyConstraintLevel,
    allowedFeatureSet,
  });

  const snapshot_id = sha256Hex(
    JSON.stringify({
      tier: snapshot.tier,
      score: snapshot.score,
      computedAt: snapshot.computedAt,
      profile: adaptation_profile,
    })
  );
  const timestamp = snapshot.computedAt;

  return Object.freeze({
    snapshot_id,
    tier: snapshot.tier,
    governance_score: snapshot.score,
    adaptation_profile,
    timestamp,
  });
}
