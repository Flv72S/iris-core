/**
 * Phase 13G — Trust Governance Bridge. Main engine.
 */

import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeTrustState } from '../trust_recovery/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGovernanceEvent } from './trust_event_types.js';
import { evaluateGovernanceTrigger } from './governance_trigger_policy.js';

/**
 * Analyze anomalies, evaluate escalation, build events. Return sorted by timestamp, event_type, event_id.
 */
export function generateGovernanceTriggers(
  anomaly_reports: readonly AnomalyReport[],
  trust_states: readonly NodeTrustState[],
  reputations: readonly NodeReputationProfile[],
  timestamp: number
): TrustGovernanceEvent[] {
  const events = evaluateGovernanceTrigger(
    anomaly_reports,
    trust_states,
    reputations,
    timestamp
  );
  return [...events].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    const typeCmp = String(a.event_type).localeCompare(String(b.event_type));
    return typeCmp !== 0 ? typeCmp : a.event_id.localeCompare(b.event_id);
  });
}
