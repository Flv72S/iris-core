/**
 * Step 9I — Governance Safety Proof Engine. Invariant checks.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import type { GovernanceTelemetryReport } from '../../telemetry/types/governance_telemetry_types.js';
import type { GovernanceAnomalyReport } from '../../anomaly_detection/types/governance_anomaly_types.js';
import type { GovernanceInvariantResult } from '../types/governance_safety_proof_types.js';

/** Invariant 1 — Determinism: snapshot hash present and non-empty */
export function checkDeterminismInvariant(
  snapshot: GlobalGovernanceSnapshot
): GovernanceInvariantResult {
  const snapshot_hash = snapshot.global_hash;
  const passed = typeof snapshot_hash === 'string' && snapshot_hash.length > 0;
  return Object.freeze({
    invariant_name: 'determinism',
    passed,
    ...(passed ? {} : { details: 'snapshot hash missing or empty' }),
  });
}

/** Invariant 2 — Telemetry consistency: total_events >= snapshot_events */
export function checkTelemetryConsistencyInvariant(
  telemetry: GovernanceTelemetryReport
): GovernanceInvariantResult {
  const { total_events, snapshot_events } = telemetry.metrics;
  const passed = total_events >= snapshot_events;
  return Object.freeze({
    invariant_name: 'telemetry_consistency',
    passed,
    ...(passed ? {} : { details: `total_events ${total_events} < snapshot_events ${snapshot_events}` }),
  });
}

/** Invariant 3 — Anomaly traceability: each anomaly has anomaly_id, severity (and description) */
export function checkAnomalyTraceabilityInvariant(
  anomaly_report: GovernanceAnomalyReport
): GovernanceInvariantResult {
  const anomalies = anomaly_report.anomalies;
  let passed = true;
  for (const a of anomalies) {
    if (
      typeof a.anomaly_id !== 'string' ||
      a.anomaly_id.length === 0 ||
      typeof a.severity !== 'string' ||
      !['low', 'medium', 'high'].includes(a.severity)
    ) {
      passed = false;
      break;
    }
  }
  return Object.freeze({
    invariant_name: 'anomaly_traceability',
    passed,
    ...(passed ? {} : { details: 'one or more anomalies missing anomaly_id or valid severity' }),
  });
}

/** Invariant 4 — Hash integrity: snapshot, telemetry, anomaly hashes all present */
export function checkHashIntegrityInvariant(
  snapshot: GlobalGovernanceSnapshot,
  telemetry: GovernanceTelemetryReport,
  anomaly_report: GovernanceAnomalyReport
): GovernanceInvariantResult {
  const snapshotOk =
    typeof snapshot.global_hash === 'string' && snapshot.global_hash.length > 0;
  const telemetryOk =
    typeof telemetry.telemetry_hash === 'string' && telemetry.telemetry_hash.length > 0;
  const anomalyOk =
    typeof anomaly_report.anomaly_hash === 'string' && anomaly_report.anomaly_hash.length > 0;
  const passed = snapshotOk && telemetryOk && anomalyOk;
  const details = passed
    ? undefined
    : [!snapshotOk && 'snapshot hash', !telemetryOk && 'telemetry hash', !anomalyOk && 'anomaly hash']
        .filter(Boolean)
        .join(', ');
  return Object.freeze({
    invariant_name: 'hash_integrity',
    passed,
    ...(details !== undefined ? { details } : {}),
  });
}
