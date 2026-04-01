/**
 * Phase 13E — Trust Recovery Framework. Main orchestration.
 */

import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import { TrustState, RecoveryActionType, type NodeTrustState, type RecoveryAction } from './recovery_types.js';
import { evaluateRecoveryPolicy } from './recovery_policy.js';
import { applyProbation } from './probation_manager.js';
import { applyCooldown, restoreTrust } from './reputation_recovery.js';

/**
 * Process anomalies into recovery actions and updated node trust states. Deterministic order.
 */
export function processAnomalyReports(
  anomalies: readonly AnomalyReport[],
  reputations: readonly NodeReputationProfile[],
  current_states: readonly NodeTrustState[],
  timestamp: number
): { actions: RecoveryAction[]; updated_states: NodeTrustState[] } {
  const repMap = new Map<string, NodeReputationProfile>();
  for (const r of reputations) repMap.set(r.node_id, r);

  const stateMap = new Map<string, NodeTrustState>();
  for (const s of current_states) stateMap.set(s.node_id, s);
  for (const r of reputations) {
    if (!stateMap.has(r.node_id)) {
      stateMap.set(r.node_id, Object.freeze({
        node_id: r.node_id,
        trust_state: TrustState.TRUSTED,
        reputation_score: r.reputation_score,
        state_timestamp: timestamp,
      }));
    }
  }

  const anomalyNodeIds = new Set(anomalies.map((a) => a.node_id));
  const actions: RecoveryAction[] = [];

  for (const anomaly of anomalies) {
    const rep = repMap.get(anomaly.node_id);
    const state = stateMap.get(anomaly.node_id);
    if (!state) continue;
    const actionType = evaluateRecoveryPolicy(anomaly, rep ?? { node_id: anomaly.node_id, reputation_score: 0, last_updated: timestamp });
    const reason = `Anomaly: ${anomaly.anomaly_type}`;
    actions.push(Object.freeze({
      node_id: anomaly.node_id,
      action_type: actionType,
      action_timestamp: timestamp,
      reason,
    }));

    if (actionType === RecoveryActionType.ENTER_PROBATION) {
      stateMap.set(anomaly.node_id, applyProbation(state, timestamp));
    } else if (actionType === RecoveryActionType.APPLY_COOLDOWN) {
      stateMap.set(anomaly.node_id, applyCooldown(state, timestamp));
    } else if (actionType === RecoveryActionType.RESTRICT_NODE) {
      stateMap.set(anomaly.node_id, Object.freeze({
        node_id: anomaly.node_id,
        trust_state: TrustState.RESTRICTED,
        reputation_score: state.reputation_score,
        state_timestamp: timestamp,
      }));
    }
  }

  for (const [node_id, state] of stateMap) {
    if (anomalyNodeIds.has(node_id)) continue;
    if (state.trust_state === TrustState.COOLDOWN || state.trust_state === TrustState.PROBATION) {
      const updated = restoreTrust(state, timestamp);
      if (updated !== state) {
        stateMap.set(node_id, updated);
        actions.push(Object.freeze({
          node_id,
          action_type: RecoveryActionType.RESTORE_TRUST,
          action_timestamp: timestamp,
          reason: 'No recent anomalies; restoration',
        }));
      }
    }
  }

  const sortedActions = [...actions].sort((a, b) => {
    const c = a.node_id.localeCompare(b.node_id);
    return c !== 0 ? c : String(a.action_type).localeCompare(String(b.action_type));
  });

  const updated_states = [...stateMap.values()].sort((a, b) => a.node_id.localeCompare(b.node_id));

  return { actions: sortedActions, updated_states };
}
