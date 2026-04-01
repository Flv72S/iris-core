/**
 * Phase 13I — Trust Explainability Engine. Main entry point.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeTrustState } from '../trust_recovery/index.js';
import type { TrustExplainabilityReport } from './explainability_types.js';
import { explainReputation } from './reputation_explainer.js';
import { explainAnomalies } from './anomaly_explainer.js';
import { explainRecoveryState } from './recovery_explainer.js';

/**
 * Generate full explainability report for a node. Read-only; deterministic.
 */
export function generateNodeExplainability(
  node_id: string,
  reputations: readonly NodeReputationProfile[],
  anomalies: readonly AnomalyReport[],
  trust_states: readonly NodeTrustState[]
): TrustExplainabilityReport {
  const reputation = reputations.find((r) => r.node_id === node_id) ?? null;
  const reputationExplanation = reputation !== null ? explainReputation(reputation) : null;

  const anomalyExplanation = explainAnomalies(node_id, anomalies);

  const trustState = trust_states.find((s) => s.node_id === node_id) ?? null;
  const recoveryExplanation = trustState !== null ? explainRecoveryState(trustState) : null;

  return Object.freeze({
    node_id,
    reputation: reputationExplanation,
    anomaly: anomalyExplanation,
    recovery: recoveryExplanation,
  });
}
