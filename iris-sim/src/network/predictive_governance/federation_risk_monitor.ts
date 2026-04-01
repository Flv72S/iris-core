/**
 * Phase 11F — Federation Risk Monitor.
 * Aggregates node-level signals into federation risk report. Deterministic.
 */

import type { PredictiveGovernanceSignal } from './predictive_governance_types.js';
import type { FederationRiskReport, RiskLevel } from './predictive_governance_types.js';

const CRITICAL_PCT_SYSTEMIC = 0.1;
const DECLINING_PCT_HIGH = 0.2;
const VOLATILE_PCT_MODERATE = 0.3;

/**
 * Compute federation-level risk report from node signals. Deterministic.
 */
export function computeFederationRisk(
  signals: readonly PredictiveGovernanceSignal[],
  timestamp: number
): FederationRiskReport {
  const total_nodes = signals.length;
  const stable_nodes = signals.filter((s) => s.stability_status === 'STABLE').length;
  const volatile_nodes = signals.filter((s) => s.stability_status === 'VOLATILE').length;
  const declining_nodes = signals.filter((s) => s.stability_status === 'DECLINING').length;
  const critical_nodes = signals.filter((s) => s.stability_status === 'CRITICAL').length;

  let systemic_risk_level: RiskLevel;
  if (total_nodes === 0) {
    systemic_risk_level = 'LOW';
  } else if (critical_nodes / total_nodes >= CRITICAL_PCT_SYSTEMIC) {
    systemic_risk_level = 'SYSTEMIC';
  } else if (declining_nodes / total_nodes >= DECLINING_PCT_HIGH) {
    systemic_risk_level = 'HIGH';
  } else if (volatile_nodes / total_nodes >= VOLATILE_PCT_MODERATE) {
    systemic_risk_level = 'MODERATE';
  } else {
    systemic_risk_level = 'LOW';
  }

  return Object.freeze({
    total_nodes,
    stable_nodes,
    volatile_nodes,
    declining_nodes,
    critical_nodes,
    systemic_risk_level,
    evaluated_timestamp: timestamp,
  });
}
