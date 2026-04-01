/**
 * Step 9H — Governance Anomaly Detection Engine. Anomaly rules.
 */

import type { GovernanceTelemetryMetrics } from '../../telemetry/types/governance_telemetry_types.js';

export interface GovernanceAnomalyRule {
  readonly rule_id: string;
  readonly check: (metrics: GovernanceTelemetryMetrics) => boolean;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

/** Rule 1 — Excessive diff events: diff_events > snapshot_events * 5 → governance altamente instabile */
export const RULE_EXCESSIVE_DIFF_EVENTS: GovernanceAnomalyRule = Object.freeze({
  rule_id: 'excessive_diff_events',
  check: (m: GovernanceTelemetryMetrics) =>
    m.snapshot_events > 0 && m.diff_events > m.snapshot_events * 5,
  description: 'Excessive diff events (governance highly unstable)',
  severity: 'high',
});

/** Rule 2 — Excessive incident investigations: incident_events > 10 */
export const RULE_EXCESSIVE_INCIDENT_EVENTS: GovernanceAnomalyRule = Object.freeze({
  rule_id: 'excessive_incident_events',
  check: (m: GovernanceTelemetryMetrics) => m.incident_events > 10,
  description: 'Excessive incident investigations (possible operational instability)',
  severity: 'medium',
});

/** Rule 3 — Compliance spike: compliance_events >= total_events (all events are compliance checks) */
export const RULE_COMPLIANCE_SPIKE: GovernanceAnomalyRule = Object.freeze({
  rule_id: 'compliance_spike',
  check: (m: GovernanceTelemetryMetrics) =>
    m.total_events > 0 && m.compliance_events >= m.total_events,
  description: 'Suspicious pattern: compliance events dominate',
  severity: 'low',
});

export const DEFAULT_ANOMALY_RULES: readonly GovernanceAnomalyRule[] = Object.freeze([
  RULE_EXCESSIVE_DIFF_EVENTS,
  RULE_EXCESSIVE_INCIDENT_EVENTS,
  RULE_COMPLIANCE_SPIKE,
]);
