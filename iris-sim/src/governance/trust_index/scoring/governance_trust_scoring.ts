/**
 * Step 9J — Governance Trust Index Engine. Deterministic scoring.
 */

import type {
  GovernanceTrustIndexInput,
  GovernanceTrustScoreBreakdown,
} from '../types/governance_trust_index_types.js';

/**
 * Compute deterministic trust score breakdown from telemetry, anomaly report, and safety proof.
 */
export function calculateGovernanceTrustScore(
  input: GovernanceTrustIndexInput
): GovernanceTrustScoreBreakdown {
  const telemetry_score = Math.min(100, input.telemetry.metrics.total_events);
  const anomaly_score = Math.max(
    0,
    100 - input.anomaly_report.anomalies.length * 5
  );
  const invariants = input.safety_proof.invariants;
  const total_invariants = invariants.length;
  const passed_invariants = total_invariants > 0
    ? invariants.filter((i) => i.passed).length
    : 0;
  const safety_score =
    total_invariants === 0 ? 100 : (passed_invariants / total_invariants) * 100;

  return Object.freeze({
    telemetry_score,
    anomaly_score,
    safety_score,
  });
}
