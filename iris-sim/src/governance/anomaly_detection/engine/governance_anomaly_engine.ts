/**
 * Step 9H — Governance Anomaly Detection Engine.
 */

import type {
  GovernanceAnomaly,
  GovernanceAnomalyInput,
  GovernanceAnomalyReport,
} from '../types/governance_anomaly_types.js';
import { DEFAULT_ANOMALY_RULES } from '../rules/governance_anomaly_rules.js';
import { computeGovernanceAnomalyHash } from '../hashing/governance_anomaly_hash.js';

/**
 * Detect governance anomalies from telemetry: apply rules and build report.
 * Does not mutate input.
 */
export function detectGovernanceAnomalies(
  input: GovernanceAnomalyInput
): GovernanceAnomalyReport {
  const metrics = input.telemetry_report.metrics;
  const anomalies: GovernanceAnomaly[] = [];

  for (const rule of DEFAULT_ANOMALY_RULES) {
    if (rule.check(metrics)) {
      anomalies.push(
        Object.freeze({
          anomaly_id: rule.rule_id,
          description: rule.description,
          severity: rule.severity,
        })
      );
    }
  }

  const source_telemetry_hash = input.telemetry_report.telemetry_hash;
  const anomaly_detected = anomalies.length > 0;

  const report: GovernanceAnomalyReport = {
    source_telemetry_hash,
    anomalies: Object.freeze(anomalies),
    anomaly_detected,
    anomaly_hash: '', // set below
  };

  const anomaly_hash = computeGovernanceAnomalyHash(report);

  return Object.freeze({
    ...report,
    anomaly_hash,
  });
}
