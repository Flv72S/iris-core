/**
 * Step 9G — Governance Telemetry Engine. Metrics calculator.
 */

import type { GovernanceObservatoryReport } from '../../observatory/types/governance_observatory_types.js';
import type { GovernanceTelemetryMetrics } from '../types/governance_telemetry_types.js';

/**
 * Count event types in the observatory report and return structured metrics.
 */
export function calculateGovernanceMetrics(
  observatory: GovernanceObservatoryReport
): GovernanceTelemetryMetrics {
  let snapshot_events = 0;
  let diff_events = 0;
  let compliance_events = 0;
  let incident_events = 0;

  for (const e of observatory.observatory_events) {
    switch (e.event_type) {
      case 'snapshot':
        snapshot_events++;
        break;
      case 'diff':
        diff_events++;
        break;
      case 'compliance_check':
        compliance_events++;
        break;
      case 'incident_analysis':
        incident_events++;
        break;
    }
  }

  const total_events = snapshot_events + diff_events + compliance_events + incident_events;

  return Object.freeze({
    total_events,
    snapshot_events,
    diff_events,
    compliance_events,
    incident_events,
  });
}
