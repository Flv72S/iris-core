/**
 * Phase 11H — Federation state notifier. Generates notifications from timeline.
 */

import type { FederationStageSnapshot, FederationNotification } from './federation_orchestration_types.js';

const STAGE_MESSAGES: Record<string, string> = Object.freeze({
  TRUST_EVALUATION: 'Trust evaluation completed',
  CERTIFICATION: 'Certification stage completed',
  PREDICTIVE_ANALYSIS: 'Predictive governance analysis completed',
  AUDIT: 'Global governance audit completed',
  CONSENSUS_FINALIZATION: 'Federation consensus finalized',
});

/**
 * Generate notifications from timeline, one per snapshot, in timeline order.
 */
export function generateFederationNotifications(
  timeline: readonly FederationStageSnapshot[]
): FederationNotification[] {
  return timeline.map((snap) =>
    Object.freeze({
      stage: snap.stage,
      message: STAGE_MESSAGES[snap.stage] ?? `${snap.stage} completed`,
      timestamp: snap.timestamp,
    })
  );
}
